from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Iterable, Sequence

import psycopg2


LEGACY_SQL_SERVER_PATTERN_LABELS: tuple[str, ...] = (
    'pyodbc',
    'ODBC Driver 18 for SQL Server',
    'ODBC Driver 17 for SQL Server',
    'SqlConnectionSettings',
    'open_sql_connection',
    '_PG_CUTOVER_ACTIVE',
    '_is_pg_cutover_active',
    'SELECT TOP',
    'UNIQUEIDENTIFIER',
    'DATETIMEOFFSET',
    'sp_getapplock',
    'sp_releaseapplock',
    'sys_catalog',
)
LEGACY_SQL_SERVER_PREFILTER_TERMS: tuple[str, ...] = (
    'pyodbc',
    'ODBC Driver 18 for SQL Server',
    'ODBC Driver 17 for SQL Server',
    'SqlConnectionSettings',
    'open_sql_connection',
    '_PG_CUTOVER_ACTIVE',
    '_is_pg_cutover_active',
    'SELECT TOP',
    'UNIQUEIDENTIFIER',
    'DATETIMEOFFSET',
    'sp_getapplock',
    'sp_releaseapplock',
    'sys.',
)
LEGACY_SQL_SERVER_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ('pyodbc', re.compile(r'\bpyodbc\b', re.IGNORECASE)),
    ('ODBC Driver 18 for SQL Server', re.compile(r'ODBC Driver 18 for SQL Server', re.IGNORECASE)),
    ('ODBC Driver 17 for SQL Server', re.compile(r'ODBC Driver 17 for SQL Server', re.IGNORECASE)),
    ('SqlConnectionSettings', re.compile(r'\bSqlConnectionSettings\b', re.IGNORECASE)),
    ('open_sql_connection', re.compile(r'\bopen_sql_connection\b', re.IGNORECASE)),
    ('_PG_CUTOVER_ACTIVE', re.compile(r'\b_PG_CUTOVER_ACTIVE\b')),
    ('_is_pg_cutover_active', re.compile(r'\b_is_pg_cutover_active\b')),
    ('SELECT TOP', re.compile(r'\bSELECT\s+TOP\b', re.IGNORECASE)),
    ('UNIQUEIDENTIFIER', re.compile(r'\bUNIQUEIDENTIFIER\b', re.IGNORECASE)),
    ('DATETIMEOFFSET', re.compile(r'\bDATETIMEOFFSET\b', re.IGNORECASE)),
    ('sp_getapplock', re.compile(r'\bsp_getapplock\b', re.IGNORECASE)),
    ('sp_releaseapplock', re.compile(r'\bsp_releaseapplock\b', re.IGNORECASE)),
    (
        'sys_catalog',
        re.compile(
            r'\b(?:from|join|into|update)\s+sys\.[A-Za-z_]+\b|\bsys\.(?:objects|columns|tables|indexes|types|schemas|procedures)\b',
            re.IGNORECASE,
        ),
    ),
)


@dataclass(frozen=True, slots=True)
class SqlServerResidueHotspot:
    file_path: str
    total_hits: int
    matched_patterns: tuple[str, ...]
    pattern_hits: dict[str, int]


def scan_code_inventory_for_sql_server_residue(
    connection: psycopg2.extensions.connection,
    *,
    path_prefixes: Sequence[str] = ('./src/',),
) -> list[SqlServerResidueHotspot]:
    if not path_prefixes:
        raise ValueError('path_prefixes must contain at least one path prefix.')

    where_clause = ' OR '.join(['file_path LIKE %s'] * len(path_prefixes))
    like_patterns = tuple(f'%{pattern}%' for pattern in LEGACY_SQL_SERVER_PREFILTER_TERMS)
    residue_clause = ' OR '.join(['content_text ILIKE %s'] * len(like_patterns))
    sql = f"""
        SELECT file_path, content_text
        FROM inventory.code_files
        WHERE ({where_clause})
          AND ({residue_clause})
        ORDER BY file_path
    """
    parameters: tuple[str, ...] = tuple(f'{prefix}%' for prefix in path_prefixes) + like_patterns

    hotspots: list[SqlServerResidueHotspot] = []
    with connection.cursor() as cursor:
        cursor.execute(sql, parameters)
        for file_path, content_text in cursor.fetchall():
            text = str(content_text or '')
            pattern_hits = detect_pattern_hits(text)
            matched_patterns = tuple(pattern for pattern, hits in pattern_hits.items() if hits > 0)
            total_hits = sum(pattern_hits.values())
            if not matched_patterns or total_hits <= 0:
                continue
            hotspots.append(
                SqlServerResidueHotspot(
                    file_path=str(file_path),
                    total_hits=total_hits,
                    matched_patterns=matched_patterns,
                    pattern_hits={pattern: hits for pattern, hits in pattern_hits.items() if hits > 0},
                )
            )
    hotspots.sort(key=lambda item: (-item.total_hits, item.file_path))
    return hotspots


def build_architecture_integrity_findings(
    hotspots: Iterable[SqlServerResidueHotspot],
    *,
    scanner_key: str,
    scanner_version: str,
) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for hotspot in hotspots:
        findings.append(
            {
                'rule_key': 'stale_runtime_infrastructure_reference',
                'severity': _severity_for_hotspot(hotspot),
                'category': 'sql_server_residue',
                'title': f'Legacy SQL Server residue remains in {hotspot.file_path}',
                'summary': _build_summary(hotspot),
                'location_ref': hotspot.file_path,
                'evidence': {
                    'file_path': hotspot.file_path,
                    'matched_patterns': list(hotspot.matched_patterns),
                    'pattern_hits': hotspot.pattern_hits,
                    'total_hits': hotspot.total_hits,
                },
                'remediation_guidance': [
                    'Remove SQL Server-specific connection settings, branches, and fallback logic from this surface.',
                    'Replace remaining SQL Server syntax and direct SQL execution with PostgreSQL-backed runtime query or mutation contracts where applicable.',
                    'Delete test expectations that still normalize SQL Server as a valid architecture target for this file.',
                ],
                'metadata': {
                    'scanner_key': scanner_key,
                    'scanner_version': scanner_version,
                    'finding_family': 'sql_server_residue',
                },
                'evidence_links': [
                    {
                        'evidence_type': 'repo_file_metric',
                        'evidence_ref': hotspot.file_path,
                        'title': 'SQL-backed code inventory hotspot',
                        'metadata': {
                            'matched_patterns': list(hotspot.matched_patterns),
                            'total_hits': hotspot.total_hits,
                        },
                    }
                ],
            }
        )
    return findings


def build_summary_patch(
    hotspots: Sequence[SqlServerResidueHotspot],
    *,
    scanner_key: str,
    scanner_version: str,
    path_prefixes: Sequence[str],
) -> dict[str, Any]:
    pattern_counts: dict[str, int] = {}
    for hotspot in hotspots:
        for pattern, hits in hotspot.pattern_hits.items():
            pattern_counts[pattern] = pattern_counts.get(pattern, 0) + hits
    return {
        'sql_server_residue_audit': {
            'scanner_key': scanner_key,
            'scanner_version': scanner_version,
            'path_prefixes': list(path_prefixes),
            'active_hotspot_count': len(hotspots),
            'pattern_counts': pattern_counts,
            'top_hotspots': [
                {
                    'file_path': hotspot.file_path,
                    'total_hits': hotspot.total_hits,
                    'matched_patterns': list(hotspot.matched_patterns),
                }
                for hotspot in list(hotspots)[:25]
            ],
        }
    }


def serialize_hotspots(hotspots: Sequence[SqlServerResidueHotspot]) -> list[dict[str, Any]]:
    return [
        {
            'file_path': hotspot.file_path,
            'total_hits': hotspot.total_hits,
            'matched_patterns': list(hotspot.matched_patterns),
            'pattern_hits': hotspot.pattern_hits,
        }
        for hotspot in hotspots
    ]


def detect_pattern_hits(text: str) -> dict[str, int]:
    return {
        label: len(pattern.findall(text))
        for label, pattern in LEGACY_SQL_SERVER_PATTERNS
    }


def _severity_for_hotspot(hotspot: SqlServerResidueHotspot) -> str:
    block_patterns = {
        'pyodbc',
        'SqlConnectionSettings',
        'open_sql_connection',
        '_PG_CUTOVER_ACTIVE',
        '_is_pg_cutover_active',
        'ODBC Driver 18 for SQL Server',
        'ODBC Driver 17 for SQL Server',
        'SELECT TOP',
        'UNIQUEIDENTIFIER',
        'sp_getapplock',
        'sp_releaseapplock',
        'sys_catalog',
    }
    return 'block' if any(pattern in block_patterns for pattern in hotspot.matched_patterns) else 'revise'


def _build_summary(hotspot: SqlServerResidueHotspot) -> str:
    patterns = ', '.join(hotspot.matched_patterns)
    return (
        f'The SQL-backed code inventory still sees {hotspot.total_hits} legacy SQL Server residue hit(s) in '
        f'{hotspot.file_path}. Matched markers: {patterns}.'
    )
def hotspots_to_json(hotspots: Sequence[SqlServerResidueHotspot]) -> str:
    return json.dumps(serialize_hotspots(hotspots), indent=2, sort_keys=True)
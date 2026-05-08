# Bespoke Python Scripts SQL Metadata

Source: remote `ai-engine` repository inventory via SDK.

## Summary
- Total scripts scanned: 284
- SQL-bearing scripts: 133
- Runtime-contract-backed scripts: 10
- Direct SQL scripts: 68
- Migration scripts: 90
- SQL Server residue / compatibility scripts: 44

## Script Index

| Script | Lines | Symbols | SQL Style | SQL Metadata |
| --- | ---: | ---: | --- | --- |
| ./scripts/add_memory_entrypoint_reminder_scope.py | 349 | 5 | direct-sql, migration | pyodbc=1; sql_connection_settings=1; cursor_execute=1; insert=1; update=1; migration=1 |
| ./scripts/advance_ai_engine_security_architecture_scope1_to_review.py | 300 | 10 | migration | insert=1; migration=1 |
| ./scripts/advance_ai_engine_security_architecture_scope2_3_approve_scope4_5_start.py | 285 | 9 | migration | insert=1; migration=1 |
| ./scripts/advance_ai_engine_security_architecture_scope2_3_to_review.py | 392 | 12 | migration | insert=1; update=1; delete=1; merge=1; migration=1 |
| ./scripts/advance_ai_engine_security_architecture_scope4_5_to_review.py | 386 | 12 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_audio_rendering_scope1_to_review.py | 287 | 10 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_retrieval_charter_start.py | 478 | 16 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_self_optimization_scope2_start.py | 267 | 9 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_self_optimization_scope2_to_review.py | 268 | 10 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_self_optimization_scope3_start.py | 265 | 9 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_self_optimization_scope4_start.py | 181 | 9 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_self_optimization_scope4_to_review.py | 209 | 10 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_self_optimization_scope5_start.py | 181 | 9 | migration | insert=1; migration=1 |
| ./scripts/advance_governed_self_optimization_scope5_to_review.py | 216 | 10 | migration | insert=1; update=1; migration=1 |
| ./scripts/advance_governed_self_optimization_scope6_start.py | 180 | 9 | migration | insert=1; migration=1 |
| ./scripts/advance_queryable_architecture_memory_charter_start.py | 431 | 16 | migration | insert=1; update=1; migration=1 |
| ./scripts/advance_self_shaping_scope2_to_review.py | 411 | 14 | migration | insert=1; migration=1 |
| ./scripts/advance_self_shaping_scope3_to_review.py | 232 | 12 | migration | insert=1; migration=1 |
| ./scripts/advance_self_shaping_scope4_to_review.py | 235 | 12 | migration | insert=1; merge=1; migration=1 |
| ./scripts/apply_sql_migration.py | 45 | 1 | direct-sql, migration | sql_connection_settings=1; cursor_execute=1; insert=1; migration=1 |
| ./scripts/approve_flows.py | 23 | 1 | direct-sql | open_sql_connection=1; sql_connection_settings=1; cursor_execute=1; select=1 |
| ./scripts/audit_code_inventory.py | 37 | 2 | runtime-contract | runtime_query=1; insert=1 |
| ./scripts/backfill_training_records.py | 299 | 11 | runtime-contract | runtime_query=1; insert=1 |
| ./scripts/bootstrap_local_ai_agent_env.py | 293 | 13 | postgresql | update=1; postgresql=1 |
| ./scripts/build_contract_driven_file_cleanup_task_plan.py | 233 | 9 | direct-sql, migration, sql-server, postgresql | pyodbc=1; select=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/build_hard_coded_sql_access_inventory.py | 276 | 11 | direct-sql, migration, sql-server, postgresql | pyodbc=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/build_procedure_function_parity_inventory.py | 310 | 10 | direct-sql, migration, sql-server, postgresql | psycopg2=1; sql_connection_settings=1; cursor_execute=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/check_pg_schema_parity.py | 88 | 3 | direct-sql, migration, postgresql | psycopg2=1; cursor_execute=1; select=1; migration=1; postgresql=1 |
| ./scripts/create_ai_performance_tasks.py | 203 | 1 | migration | select=1; insert=1; update=1; migration=1 |
| ./scripts/dual_read_probe.py | 330 | 12 | migration, postgresql | insert=1; update=1; migration=1; postgresql=1 |
| ./scripts/execute_workflow_run_checkpoint_evidence_wrapper.py | 1140 | 15 | sql-server | insert=1; sql_server=1 |
| ./scripts/export_agent_session_performance_report.py | 609 | 24 | runtime-contract | runtime_query=1; insert=1 |
| ./scripts/export_azure_sql_data.py | 237 | 11 | direct-sql, migration, sql-server, postgresql | pyodbc=1; sql_connection_settings=1; cursor_execute=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/export_azure_sql_database_bacpac.py | 152 | 8 | sql-server | sql_server=1 |
| ./scripts/export_azure_sql_inventory.py | 330 | 10 | direct-sql, migration, sql-server, postgresql | pyodbc=1; sql_connection_settings=1; cursor_execute=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/export_blocker_report.py | 795 | 27 | direct-sql, sql-server | sql_connection_settings=1; cursor_execute=1; select=1; insert=1; update=1; sql_server=1 |
| ./scripts/export_context_assembly_performance_metrics.py | 476 | 11 | direct-sql, sql-server | sql_connection_settings=1; insert=1; sql_server=1 |
| ./scripts/export_current_assistant_turn_snapshot.py | 640 | 14 | direct-sql | sql_connection_settings=1; insert=1 |
| ./scripts/export_current_codebase_shape_status.py | 367 | 11 | direct-sql, postgresql | sql_connection_settings=1; insert=1; postgresql=1 |
| ./scripts/export_current_script_discovery_status.py | 297 | 12 | direct-sql, sql-server | sql_connection_settings=1; insert=1; sql_server=1 |
| ./scripts/export_current_security_governance_status.py | 361 | 11 | direct-sql | sql_connection_settings=1; insert=1 |
| ./scripts/export_current_status_bundle.py | 154 | 6 | direct-sql | sql_connection_settings=1; insert=1 |
| ./scripts/export_current_workflow_status.py | 458 | 11 | direct-sql | sql_connection_settings=1; insert=1 |
| ./scripts/export_docs_workflow_relationship_report.py | 558 | 17 | direct-sql, sql-server | sql_connection_settings=1; insert=1; sql_server=1 |
| ./scripts/export_generator_command_center_snapshot.py | 383 | 14 | direct-sql, sql-server | pyodbc=1; sql_connection_settings=1; cursor_execute=1; select=1; sql_server=1 |
| ./scripts/export_governed_self_optimization_live_validation.py | 484 | 16 | direct-sql, sql-server | sql_connection_settings=1; insert=1; sql_server=1 |
| ./scripts/export_governed_self_optimization_status.py | 323 | 17 | direct-sql, sql-server | sql_connection_settings=1; insert=1; sql_server=1 |
| ./scripts/export_portfolio_bundle_report.py | 279 | 13 | direct-sql, sql-server | sql_connection_settings=1; insert=1; sql_server=1 |
| ./scripts/export_portfolio_report.py | 281 | 15 | direct-sql, sql-server | sql_connection_settings=1; insert=1; sql_server=1 |
| ./scripts/export_project_charter_report.py | 478 | 16 | runtime-contract, direct-sql | runtime_query=1; sql_connection_settings=1; insert=1 |
| ./scripts/export_project_implementation_roadmap_report.py | 720 | 11 | runtime-contract, direct-sql | runtime_query=1; sql_connection_settings=1; insert=1; update=1 |
| ./scripts/export_self_learning_status.py | 295 | 12 | direct-sql, sql-server | sql_connection_settings=1; insert=1; sql_server=1 |
| ./scripts/generate_consumers_json.py | 296 | 8 | direct-sql, migration, postgresql | psycopg2=1; select=1; insert=1; migration=1; postgresql=1 |
| ./scripts/import_postgres_data.py | 389 | 8 | direct-sql, migration, postgresql | psycopg2=1; cursor_execute=1; select=1; insert=1; update=1; migration=1; postgresql=1 |
| ./scripts/inspect_neon_auth_activation_compliance.py | 202 | 4 | direct-sql | cursor_execute=1; select=1; insert=1 |
| ./scripts/query_candidates.py | 7 | 1 | direct-sql | open_sql_connection=1; sql_connection_settings=1; cursor_execute=1; select=1 |
| ./scripts/rebuild_generator_command_center.py | 150 | 7 | direct-sql | pyodbc=1; sql_connection_settings=1; cursor_execute=1; insert=1; delete=1 |
| ./scripts/reconcile_add_anti_pattern_rules_for_stale_infrastructure_drift_completion.py | 255 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_add_dialect_regression_tests_completion.py | 132 | 6 | direct-sql, migration, sql-server, postgresql | pyodbc=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_build_data_access_adapter_layer_completion.py | 212 | 9 | migration, sql-server, postgresql | select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_contract_driven_cutover_completion_audit_progress.py | 271 | 9 | direct-sql, migration, sql-server, postgresql | pyodbc=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_define_json_data_access_contract_schema_completion.py | 253 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_function_smoke_tests_and_parity_probes_completion.py | 249 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_hard_coded_sql_access_inventory_completion.py | 247 | 9 | direct-sql, migration, postgresql | pyodbc=1; select=1; insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_make_code_shaping_continuous_completion.py | 253 | 9 | migration, sql-server, postgresql | insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_migrated_data.py | 537 | 2 | direct-sql, migration, postgresql | psycopg2=1; cursor_execute=1; select=1; migration=1; postgresql=1 |
| ./scripts/reconcile_migration_foundation_statuses.py | 398 | 15 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_migration_scope10_11_completion.py | 266 | 10 | migration, sql-server, postgresql | insert=1; update=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_migration_scope12_completion.py | 262 | 10 | direct-sql, migration, sql-server, postgresql | pyodbc=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_migration_scope13_completion.py | 246 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_migration_scope13_progress.py | 167 | 1 | migration, postgresql | migration=1; postgresql=1 |
| ./scripts/reconcile_migration_scope14_completion.py | 212 | 3 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_migration_scope14_progress.py | 204 | 4 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_migration_scope17_completion.py | 295 | 11 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_migration_scope18_completion.py | 299 | 11 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_migration_scope18_item1_completion.py | 282 | 10 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_migration_scope5_completion.py | 302 | 11 | migration, sql-server, postgresql | select=1; insert=1; update=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_migration_scope8_9_completion.py | 259 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_neon_auth_roadmap_statuses.py | 470 | 17 | direct-sql, postgresql | cursor_execute=1; select=1; insert=1; update=1; postgresql=1 |
| ./scripts/reconcile_postgresql_dbeaver_inspection_parity_completion.py | 249 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_postgresql_sot_foundation_and_scope19_progress.py | 425 | 10 | migration, postgresql | insert=1; update=1; migration=1; postgresql=1 |
| ./scripts/reconcile_postgresql_sot_scope19_completion.py | 253 | 8 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_postgresql_sot_scope20_completion.py | 236 | 8 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_postgresql_sot_scope21_completion.py | 266 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_postgresql_sot_scope22_completion.py | 261 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_remove_azure_deployment_assumptions_completion.py | 251 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_remove_legacy_azure_sql_fallbacks_completion.py | 251 | 9 | direct-sql, migration, sql-server, postgresql | pyodbc=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_replace_script_level_select_queries_completion.py | 142 | 6 | direct-sql, migration, sql-server, postgresql | pyodbc=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_replace_script_level_select_queries_progress.py | 173 | 7 | migration, postgresql | select=1; insert=1; migration=1; postgresql=1 |
| ./scripts/reconcile_replit_deployment_validation_completion.py | 250 | 9 | migration, sql-server, postgresql | insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_runtime_authority_completion.py | 271 | 9 | migration, sql-server, postgresql | insert=1; update=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_stored_procedure_function_parity_inventory_completion.py | 248 | 9 | migration, sql-server, postgresql | insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/reconcile_view_read_model_parity_completion.py | 249 | 9 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/record_cicd_run_steps.py | 202 | 10 | runtime-contract | runtime_mutation=1; insert=1 |
| ./scripts/record_cicd_status.py | 105 | 5 | runtime-contract | runtime_mutation=1; insert=1 |
| ./scripts/record_sql_server_residue_findings.py | 133 | 2 | direct-sql, sql-server | psycopg2=1; insert=1; sql_server=1 |
| ./scripts/report_database_context.py | 69 | 2 | direct-sql, postgresql | sql_connection_settings=1; postgresql=1 |
| ./scripts/report_workflow_cycle_time.py | 87 | 3 | runtime-contract | runtime_query=1; insert=1 |
| ./scripts/reset_migration_roadmap_statuses.py | 103 | 1 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/resolve_charter_approval_step_compliance.py | 417 | 9 | direct-sql | cursor_execute=1; select=1; insert=1 |
| ./scripts/resolve_neon_auth_activation_compliance.py | 327 | 9 | direct-sql, migration, postgresql | cursor_execute=1; select=1; insert=1; migration=1; postgresql=1 |
| ./scripts/resolve_neon_auth_charter_approval_compliance.py | 268 | 9 | direct-sql, migration, postgresql | cursor_execute=1; select=1; insert=1; migration=1; postgresql=1 |
| ./scripts/resolve_policy_evaluation_authority.py | 155 | 5 | direct-sql | sql_connection_settings=1; cursor_execute=1; select=1; insert=1; update=1 |
| ./scripts/revise_agent_session_compliance_charter.py | 747 | 13 | direct-sql | cursor_execute=1; select=1; insert=1; update=1; delete=1 |
| ./scripts/revise_governed_workflow_run_refactor_charter.py | 417 | 12 | direct-sql | cursor_execute=1; select=1; insert=1; update=1; delete=1 |
| ./scripts/revise_self_shaping_charter.py | 384 | 8 | direct-sql | cursor_execute=1; select=1; insert=1; update=1 |
| ./scripts/run_charter.py | 1377 | 22 | direct-sql | open_sql_connection=1; cursor_execute=1; select=1; insert=1; update=1; delete=1 |
| ./scripts/seed_contract_driven_cutover_completion_audit_roadmap_v6.py | 495 | 9 | direct-sql, migration, sql-server, postgresql | pyodbc=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/seed_contract_driven_cutover_execution_structure.py | 451 | 10 | runtime-contract, direct-sql, migration, sql-server, postgresql | runtime_query=1; pyodbc=1; select=1; insert=1; update=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/seed_isolated_benchmark_seed_pack.py | 453 | 9 | direct-sql | cursor_execute=1; select=1; insert=1 |
| ./scripts/seed_postgresql_sot_followon_roadmap.py | 747 | 9 | migration, postgresql | insert=1; update=1; migration=1; postgresql=1 |
| ./scripts/seed_runtime_cicd_postgres_replit_alignment_roadmap_v4.py | 828 | 9 | direct-sql, migration, sql-server, postgresql | pyodbc=1; insert=1; update=1; delete=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/seed_runtime_cicd_postgres_replit_alignment_roadmap_v5.py | 829 | 9 | direct-sql, migration, sql-server, postgresql | pyodbc=1; select=1; insert=1; update=1; delete=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/seed_runtime_cicd_postgres_replit_alignment_roadmap.py | 685 | 9 | direct-sql, migration, sql-server, postgresql | pyodbc=1; insert=1; update=1; delete=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/transform_azure_sql_jsonl.py | 54 | 2 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/update_assistant_turn_db.py | 2071 | 37 | direct-sql | cursor_execute=1; select=1; insert=1; update=1 |
| ./scripts/update_candidates_metadata.py | 21 | 1 | direct-sql | open_sql_connection=1; sql_connection_settings=1; select=1; update=1 |
| ./scripts/update_promotion_backlog.py | 50 | 1 | direct-sql | open_sql_connection=1; sql_connection_settings=1; cursor_execute=1; select=1 |
| ./scripts/validate_sql_migrations.py | 99 | 3 | migration | migration=1 |
| ./scripts/verify_codebase_shape_continuity.py | 213 | 6 | direct-sql, migration, sql-server, postgresql | sql_connection_settings=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/verify_contract_driven_cutover_completion_audit.py | 240 | 7 | direct-sql, migration, sql-server, postgresql | pyodbc=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/verify_dialect_regression_guards.py | 87 | 3 | migration, sql-server, postgresql | insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/verify_migration_scope14_completion.py | 218 | 6 | direct-sql, migration, sql-server, postgresql | pyodbc=1; insert=1; update=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/verify_migration_scope14_progress.py | 152 | 4 | migration, postgresql | insert=1; migration=1; postgresql=1 |
| ./scripts/verify_migration_scope8_9.py | 177 | 7 | direct-sql, migration, sql-server, postgresql | psycopg2=1; cursor_execute=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/verify_postgresql_dbeaver_inspection_parity.py | 146 | 4 | direct-sql, migration, postgresql | psycopg2=1; sql_connection_settings=1; cursor_execute=1; insert=1; migration=1; postgresql=1 |
| ./scripts/verify_postgresql_function_smoke_tests.py | 313 | 8 | direct-sql, migration, postgresql | psycopg2=1; sql_connection_settings=1; cursor_execute=1; select=1; insert=1; migration=1; postgresql=1 |
| ./scripts/verify_postgresql_view_read_model_parity.py | 227 | 4 | direct-sql, migration, postgresql | psycopg2=1; sql_connection_settings=1; cursor_execute=1; select=1; insert=1; migration=1; postgresql=1 |
| ./scripts/verify_remove_legacy_azure_sql_fallbacks.py | 176 | 7 | direct-sql, migration, sql-server, postgresql | pyodbc=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/verify_replit_deployment_validation.py | 227 | 6 | direct-sql, migration, sql-server, postgresql | pyodbc=1; insert=1; update=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/verify_runtime_data_access_adapter_layer.py | 124 | 2 | runtime-contract, migration, sql-server, postgresql | runtime_query=1; insert=1; migration=1; sql_server=1; postgresql=1 |
| ./scripts/verify_runtime_query_contract_schema.py | 112 | 4 | migration, postgresql | migration=1; postgresql=1 |
| ./scripts/verify_stale_infrastructure_drift_patterns.py | 323 | 9 | direct-sql, migration, sql-server, postgresql | psycopg2=1; sql_connection_settings=1; cursor_execute=1; select=1; insert=1; migration=1; sql_server=1; postgresql=1 |

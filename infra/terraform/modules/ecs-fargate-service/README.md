# module: ecs-fargate-service

The shared pattern for a single-container Fargate service. Instantiated twice by `ecs` (frontend, backend) as
**two explicit module blocks** (not a `for_each` map). Spec: §5.3.

> Documentation-only until issue **#179** adds the Terraform configuration. No `.tf` here yet — do not run
> Terraform against this directory.

## Responsibility

CloudWatch log group; ECS task definition; ECS service (`wait_for_steady_state = false`, fixed in v1); service
security group with **explicit** ingress (only from the ALB SG on the container port) and **explicit** egress;
target group; health check; deployment min/max healthy percentages; public-subnet networking with
`assign_public_ip`; environment and Secrets Manager injection. The module **creates its own task execution
role**, scoped to exactly the ARNs in the `secrets` map (empty map ⇒ no policy). **No task role** is created
(the app makes no AWS API calls at runtime).

Deliberately **not** a universal ECS module: no arbitrary container count, sidecars, capacity providers,
blue/green, Service Connect, Cloud Map, or arbitrary IAM policy JSON.

## Planned inputs

`name`, `cluster_arn`, `common_tags`, `project_name`, `environment`, `container_image` (digest-pinned),
`container_port`, `desired_count`, `cpu`, `memory`, `public_subnet_ids`, `assign_public_ip`,
`alb_security_group_id`, `vpc_id`, `environment_variables`, `secrets`, `health_check_path`,
`health_check_grace_period_seconds`, `deployment_min_healthy_percent`, `deployment_max_percent`,
`log_retention_days`.

## Planned outputs

`service_name`, `target_group_arn`, `security_group_id`, `log_group_name`, `task_definition_arn`,
`execution_role_arn`.

Implemented in: **#179** (consumed by the `ecs` core stack, #180).

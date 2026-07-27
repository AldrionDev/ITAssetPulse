# module: ecs-fargate-service

The shared pattern for a single-container Fargate service. Instantiated twice by `ecs` (frontend, backend) as
**two explicit module blocks** (not a `for_each` map). Spec: §5.3.

## Responsibility

CloudWatch log group; ECS task definition; ECS service (`wait_for_steady_state = false`, fixed in v1; no
`deployment_circuit_breaker` block — see "Deployment circuit breaker" below); service security group with
**explicit** ingress (only from the ALB SG on the container port) and **explicit** egress; deployment min/max
healthy percentages; public-subnet networking with `assign_public_ip`; environment and Secrets Manager
injection. The module **creates its own task execution role**, scoped to exactly the ARNs in the `secrets` map
(empty map ⇒ no policy). **No task role** is created (the app makes no AWS API calls at runtime). The module
has no `provider` block — the caller's `aws` provider is used.

Deliberately **not** a universal ECS module: no arbitrary container count, sidecars, capacity providers,
blue/green, Service Connect, Cloud Map, or arbitrary IAM policy JSON.

## Target group ownership (moved to the `ecs` root stack)

This module does **not** create a target group and does **not** configure a health check. AWS requires a
target group to already be attached to a load balancer listener/listener rule before an ECS service can
reference it in its `load_balancer` block. If this module created both the target group and the ECS service,
the service (created inside the module) could never be made to depend on the listener rule that the caller
(`ecs` root stack, #180) builds *from* the module's own `target_group_arn` output — that dependency direction
cannot be expressed across a module boundary without a graph problem. Instead, the `ecs` root stack creates the
target group next to the ALB and listener it is coupled with, and passes the ARN in as the `target_group_arn`
input. The `ecs` root stack's `module` block additionally sets an explicit `depends_on` on the listener rule
that attaches the target group, so the target group is guaranteed to be "behind" a listener before this
module's ECS service is created — keeping the whole `target group → listener/listener rule → ECS service`
chain inside a single `terraform apply`.

## Deployment circuit breaker

Not enabled in v1. The circuit breaker's failure detection relies on the service's ELB health checks passing;
in this project's design, the backend target intentionally stays unhealthy until an operator completes the
manual MongoDB Atlas IP allow-list step (spec §11). Enabling automatic rollback would fight that design by
rolling back before the operator finishes the manual step. `wait_for_steady_state = false` is set for the same
reason.

## Inputs

`name`, `cluster_arn`, `common_tags`, `project_name`, `environment`, `container_image` (digest-pinned URI,
validated — see below), `container_port`, `desired_count`, `cpu`, `memory` (validated against the supported
Fargate CPU/memory pairs — see below), `public_subnet_ids`, `assign_public_ip`, `alb_security_group_id`,
`vpc_id`, `environment_variables` (map(string)), `secrets` (map(string), name → Secrets Manager ARN),
`target_group_arn` (Elastic Load Balancing target group ARN, created and attached to a listener/listener rule
by the `ecs` root stack), `health_check_grace_period_seconds`, `deployment_min_healthy_percent`,
`deployment_max_percent`, `log_retention_days`. **No role ARN input** (the module creates its own execution
role). **No `health_check_path` input** — health check configuration lives on the target group, owned by the
`ecs` root stack.

### `container_image` validation

Must be a digest-pinned URI: `<repository-uri>@sha256:<64 lowercase hex characters>`. Tags (including
`latest` or a Git SHA tag), whitespace, and multiple `@` characters are rejected. The `ecs` root stack produces
this value via `data "aws_ecr_image"` digest lookup driven by `release_sha`; this module only validates the
final format.

### `target_group_arn` validation

Must be a fully-formed Elastic Load Balancing target group ARN
(`arn:aws:elasticloadbalancing:<region>:<account-id>:targetgroup/<name>/<id>`).

### Fargate CPU/memory validation

`cpu` and `memory` are `number` inputs (converted to strings for the task definition, since the AWS API fields
are strings). A `lifecycle.precondition` on the task definition checks the pair against the full documented
Linux/X86_64 Fargate CPU → memory (MiB) option table, using a safe `lookup(..., [])` so an unrecognized `cpu`
value produces this module's own error message instead of an index error.

### Platform version and runtime platform

CPU sizes 8192 and 16384 require at least Linux platform version `1.4.0`. The service sets
`platform_version = "1.4.0"` explicitly (not an input — a fixed, documented choice) rather than relying on the
`LATEST` default. The task definition pins `runtime_platform { operating_system_family = "LINUX",
cpu_architecture = "X86_64" }`. No ARM64 option in this module.

## Outputs

`service_name`, `security_group_id`, `log_group_name`, `task_definition_arn`, `execution_role_arn`. **No
`target_group_arn` output** — the module receives the target group ARN as an input, it does not produce one.

Implemented in: **#179** (consumed by the `ecs` core stack, #180).

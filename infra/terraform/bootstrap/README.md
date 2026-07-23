# stack: bootstrap (local state, persistent)

Creates **only** the Terraform remote-state infrastructure. Spec: §4.1.

> Documentation-only until issue **#172** adds the Terraform configuration. No `.tf` here yet — do not run
> Terraform against this directory.

## Responsibility

S3 state bucket (versioning, SSE-S3, public-access block, native lockfile) with `prevent_destroy = true`. Uses
**local state** and creates nothing else. Persistent guardrails (Budget, SNS, GitHub OIDC) live in the
`account` stack, not here.

## Planned inputs (environment-agnostic)

`project_name`, `aws_region`. See `terraform.tfvars.example`.

## Planned outputs

`state_bucket_name`, `state_bucket_region`.

## Notes

Will document the state/lock IAM contract (state object: `GetObject`/`PutObject`; lock object `.tflock`:
`GetObject`/`PutObject`/`DeleteObject` — no `DeleteObject` on the state object), break-glass deletion, and local
bootstrap-state recovery/import.

Implemented in: **#172**.

# module: ecr-repository

A single ECR repository and its lifecycle policy. Instantiated twice by `foundation` (backend, frontend).
Spec: §5.2.

> Documentation-only until issue **#174** adds the Terraform configuration. No `.tf` here yet — do not run
> Terraform against this directory.

## Responsibility

ECR repository; image scanning; lifecycle policy; tags. **Image tag mutability is fixed to `IMMUTABLE` inside
the module** (not a caller-selectable input). `force_delete` is supported for ephemeral teardown.

## Planned inputs

`name`, `common_tags`, `scan_on_push`, `lifecycle_keep_count`, `force_delete`.

## Planned outputs

`repository_url`, `repository_arn`, `repository_name`.

Implemented in: **#174**.

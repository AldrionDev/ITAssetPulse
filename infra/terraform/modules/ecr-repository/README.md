# module: ecr-repository

A single ECR repository and its lifecycle policy. Instantiated twice by `foundation` (backend, frontend).
Spec: §5.2.

## What it creates

- `aws_ecr_repository` — `image_tag_mutability` is fixed to `IMMUTABLE` inside the module (not a caller
  input); `force_delete = var.force_delete` allows a clean `terraform destroy` even with images still present
  (spec §10.4, ephemeral teardown); `image_scanning_configuration.scan_on_push = var.scan_on_push`.
- `aws_ecr_lifecycle_policy` — a single rule expiring images beyond the most recent `lifecycle_keep_count`
  (`tagStatus = "any"`, `countType = "imageCountMoreThan"`), confirmed against the current AWS ECR lifecycle
  policy schema.

## Inputs / outputs

- Inputs: `name`, `common_tags`, `scan_on_push`, `lifecycle_keep_count` (must be a positive whole number),
  `force_delete`.
- Outputs: `repository_url`, `repository_arn`, `repository_name`.

Implemented in: **#174**.

# stack: account (remote state, persistent)

Persistent account-level guardrails and CI identity that survive demo teardown. Spec: §4.2.
State key: `itassetpulse/global/account.tfstate`.

> Documentation-only until issue **#173** adds the Terraform configuration. No `.tf` here yet — do not run
> Terraform against this directory.

## Responsibility

AWS Budget (with the SNS resource policy that lets AWS Budgets publish); shared SNS topic + email subscription
(one-time confirmation); GitHub OIDC provider (data-sourced if one already exists); minimal image-publish IAM
role scoped to ECR push on the project repositories. A **read-only shared-account preflight** (spec §13.1)
precedes creation. The AWS account ID is obtained via `aws_caller_identity`, never hardcoded.

## Planned inputs (environment-agnostic)

`project_name`, `aws_region`, `budget_limit_usd`, `budget_notification_email`, `github_owner`, `github_repo`,
`github_oidc_subject_claims`, `create_oidc_provider`. See `terraform.tfvars.example`.

## Planned outputs

`sns_topic_arn`, `budget_name`, `github_oidc_provider_arn`, `image_publish_role_arn`.

Implemented in: **#173**.

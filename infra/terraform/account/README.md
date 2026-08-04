# stack: account (remote state, persistent)

Persistent account-level guardrails and CI identity that survive demo teardown. Spec: §4.2.
State: HCP Terraform workspace `itassetpulse-account` (organization `gabor-toth-personalprojects`),
Local execution mode. Migrated from the former S3 backend in #203.

> **Known drift — owned by #207.** The account state holds **seven** managed resources, including
> `aws_iam_openid_connect_provider.github_actions[0]`. AWS no longer has that provider (it was removed
> out-of-band), so a plan currently proposes re-creating it plus an in-place update of the dependent
> `aws_iam_role.image_publish`. **Do not apply this stack while that drift is open** — #203 deliberately
> preserved the resource unchanged, and #207 resolves it by removing it from the configuration rather than
> by re-creating it in AWS.

## What it creates

- `aws_budgets_budget` — monthly cost budget (`budget_limit_usd`), `ACTUAL` alerts at 50/80/100%. A delayed
  cost signal, not a real-time kill switch. No automatic budget actions.
- `aws_sns_topic` + `aws_sns_topic_policy` — shared topic the budget notifies; the policy has two
  statements: one scopes `SNS:Publish` to the `budgets.amazonaws.com` service principal, restricted by
  `aws:SourceAccount` (this account) and `aws:SourceArn` (an account-scoped wildcard budget ARN pattern — see
  "Budget/SNS dependency order" below for why it is not scoped to the specific budget resource); the other
  scopes `SNS:Publish` to the `cloudwatch.amazonaws.com` service principal for the `ecs` stack's #181
  observability alarms (see "CloudWatch alarm SNS publish permission" below).
- `aws_sns_topic_subscription` — one `email` subscription to `budget_notification_email`. Requires a
  one-time manual confirmation (see "SNS email subscription lifecycle" below).
- `aws_iam_openid_connect_provider` for `token.actions.githubusercontent.com` — created only if
  `create_oidc_provider = true`; otherwise data-sourced by URL from an existing provider.
- `aws_iam_role` + `aws_iam_role_policy` — minimal image-publish role assumable via GitHub Actions OIDC,
  scoped to ECR push on `${project_name}-*` repositories.

No IAM resource for the state-access contract, no VPC/ECR/Atlas/ECS/ALB resource, no application code, no
image-publish workflow — all out of scope for this stack.

## State baseline (verified in #203)

Seven managed resources and five data-source addresses. All seven were migrated to HCP Terraform unchanged:

```text
aws_budgets_budget.monthly_cost
aws_iam_openid_connect_provider.github_actions[0]
aws_iam_role.image_publish
aws_iam_role_policy.image_publish
aws_sns_topic.budget_alerts
aws_sns_topic_policy.budget_alerts
aws_sns_topic_subscription.budget_alerts_email
```

> **Historical correction.** #201/#202/#203 planning documents stated that this state held *six* managed
> resources. That figure was an inherited assumption, never verified against the state. The #203 Gate 4
> preflight read the real state and found **seven**: the extra address is
> `aws_iam_openid_connect_provider.github_actions[0]`, present because the real (git-ignored)
> `terraform.tfvars` keeps `create_oidc_provider = true`. It was a legitimate managed member of the state
> throughout #203 and was preserved unchanged; **#203 did not remove it**. Its removal belongs to #207.

## Inputs / outputs

- Inputs: `project_name`, `aws_region`, `budget_limit_usd`, `budget_notification_email` (sensitive),
  `github_owner`, `github_repo`, `github_branch`, `create_oidc_provider`. See `terraform.tfvars.example`.
- Outputs: `sns_topic_arn`, `budget_name`, `github_oidc_provider_arn`, `image_publish_role_arn`. None are
  secret values.

### GitHub OIDC trust scope

The trust policy's `sub` condition is built from a single, locally composed value —
`repo:${github_owner}/${github_repo}:ref:refs/heads/${github_branch}` — using `StringEquals` (an exact
value, not a wildcard pattern). Only workflow runs dispatched against `github_branch` (default `main`) can
assume the image-publish role; there is no wildcard across GitHub repositories or branches.

## Read-only shared-account preflight (repeat before every apply)

The AWS account is shared. Re-run this immediately before every apply, not just once — state in a shared
account can change between runs:

```bash
aws sts get-caller-identity
aws configure get region
aws s3api head-bucket --bucket <bootstrap-state-bucket>
aws iam list-open-id-connect-providers        # check for an existing token.actions.githubusercontent.com provider
aws iam get-role --role-name itassetpulse-image-publish
aws sns list-topics
aws budgets describe-budgets --account-id <account-id>
aws iam simulate-principal-policy --policy-source-arn <caller-arn> --action-names <required-actions>
```

**`simulate-principal-policy` is advisory only.** It does not guarantee that a live apply will succeed in a
shared or AWS-Organizations-governed account: service control policies, permission boundaries, or other
restrictions may not surface identically in the simulation as they would on an actual API call. The real
confirmation of whether the stack can be applied comes from the runtime-verification chain below —
**reviewed saved plan → separate apply approval → apply → AWS CLI read-only verification → no-op plan** —
not from the preflight simulation.

## Budget/SNS dependency order

Final dependency graph: **SNS topic → SNS topic policy → Budget** (one direction only).

The SNS topic policy's `aws:SourceArn` condition is **not** scoped to the specific
`aws_budgets_budget.monthly_cost.arn` — doing so would create a Terraform dependency cycle, because the
Budget also depends on the topic policy (`depends_on`, to guarantee the publish permission exists before
Budgets is configured to use the topic). Instead, `SourceArn` uses an account-scoped wildcard budget ARN
pattern built from `aws_partition` + `aws_caller_identity`
(`arn:<partition>:budgets::<account-id>:budget/*`). This matches any Budgets resource in this account, not
only the one this stack manages — a deliberate trade-off to avoid the cycle. Combined with the
`aws:SourceAccount` condition, it still excludes every other AWS account's Budgets resources; the principal
remains scoped to the `budgets.amazonaws.com` service only.

## CloudWatch alarm SNS publish permission

The `AllowCloudWatchAlarmsPublish` statement lets the `ecs` stack's #181 observability alarms
(`<name_prefix>-frontend-healthy-host`, `<name_prefix>-backend-healthy-host`, `<name_prefix>-alb-target-5xx`)
deliver their `alarm_actions`/`ok_actions` to this topic. Unlike the Budgets statement above (which is
account-scoped, for the cycle-avoidance reason explained), this statement uses **three separate `ArnLike`
patterns** (`local.cloudwatch_alarm_source_arns`), one per alarm — each is
`arn:<partition>:cloudwatch:<region>:<account-id>:alarm:<project_name>-*-<alarm-suffix>`, where the wildcard
replaces only the `ecs` stack's `environment` segment (e.g. `demo`) and each alarm's functional suffix
(`-frontend-healthy-host`, `-backend-healthy-host`, `-alb-target-5xx`) stays fixed. This is deliberately
narrower than a single `<project_name>-*` wildcard would be, at the cost of listing a new pattern if a future
alarm is added to the `ecs` stack.

This stack stays environment-agnostic: it takes no `var.environment` input and does not read the `ecs` remote
state to build these patterns — the dependency direction remains `account → ecs` (§6), never the reverse. Both
statements are combined into the same `data.aws_iam_policy_document`, so `aws_sns_topic_policy.budget_alerts`
carries both grants; `Resource` on both statements is always exactly `aws_sns_topic.budget_alerts.arn`, never
`"*"`.

## SNS email subscription lifecycle

`email` is a Terraform **"partially supported"** SNS subscription protocol (per the `aws_sns_topic_subscription`
resource documentation): an unconfirmed subscription cannot be deleted or unsubscribed by Terraform.
Destroying an unconfirmed subscription removes it from Terraform state but **does not** remove it from AWS.
The `pending_confirmation` attribute reports the confirmation status, and only a **confirmed** subscription
can later be imported and fully managed (see "Recovery / import" below).

Runtime-verification order after apply:

1. check the subscription's initial `PendingConfirmation` state (`aws sns list-subscriptions-by-topic`);
2. the operator confirms the subscription via the link in the email AWS sends — a **manual, one-time step**,
   not automatable through Terraform;
3. re-check that the subscription now has a confirmed ARN;
4. only then is the email delivery setup considered complete.

> Alerts published while the email subscription is unconfirmed are not delivered to that email endpoint.

Before destroying this stack, separately verify the subscription's confirmation status — an unconfirmed
subscription cannot be properly removed by Terraform (see above).

## State access (no AWS IAM state contract any more)

Since #203 the state lives in HCP Terraform, so no AWS IAM permission is needed to read or write it. An
operator needs:

- an HCP Terraform token obtained with `terraform login app.terraform.io`, stored outside the repository;
- membership of the `gabor-toth-personalprojects` organization with access to the `itassetpulse-account`
  workspace;
- AWS credentials only for the *provider* operations (refresh/plan/apply against AWS), never for state.

The former S3 state/lock IAM contract is historical and applies only to the `bootstrap` stack until #209
retires it.

## IAM role recreation

Recreating the `image_publish` role (e.g., after an import/recovery or a name change) is **not** guaranteed
to be free of downstream impact:

> Recreating the role with the same name restores the same ARN format, but AWS assigns a new unique
> principal ID. Any resource-based policies or trust relationships that referenced the deleted role must be
> reviewed and, where necessary, updated.

## Recovery / import (remote state lost or corrupted)

The account state lives in HCP Terraform, which keeps a full state-version history per workspace:

1. Preferred: roll back to a prior **HCP Terraform state version** of the `itassetpulse-account` workspace
   from the workspace's *States* view. Any state rollback requires explicit approval and a separately
   reviewed procedure — it is never routine.
2. If that is not possible:
   1. import **all** relevant managed resources first (table below);
   2. only then run a single, full `terraform plan`;
   3. review **every** proposed change (default- or drift-related differences can produce changes);
   4. treat a no-op plan as the desired end state, not an assumed immediate result.

| Resource | Import identifier |
|---|---|
| `aws_budgets_budget` | `AccountID:BudgetName` |
| `aws_sns_topic` | topic ARN |
| `aws_sns_topic_policy` | topic ARN |
| `aws_sns_topic_subscription` (confirmed only) | subscription ARN (`<topic-arn>:<subscription-id>`) — an unconfirmed subscription cannot be imported |
| `aws_iam_openid_connect_provider` (only if this stack created it) | provider ARN |
| `aws_iam_role` | role name |
| `aws_iam_role_policy` (inline policy) | `role_name:role_policy_name` |

## Break-glass deletion

Not `prevent_destroy`-protected (unlike the bootstrap state bucket) — every resource here is cheap to
recreate:

- **Budget** — recreation has no data-loss consequence.
- **SNS topic** — recreation requires the email subscription to be **reconfirmed** (a new confirmation
  email is sent) — operational friction, not data loss.
- **IAM role/policy** — see "IAM role recreation" above; review dependent trust/resource policies after
  recreation.
- **GitHub OIDC provider (shared-account risk)** — if this stack created it, another team in the shared
  account may have started relying on it instead of creating their own. Destroying this stack's provider is
  **not** Terraform-protected; before destroying, verify (coordinate with the shared account owner) that no
  other identity or workflow depends on it.

## Remote-state locking verification

HCP Terraform locks the workspace itself; there is no `.tflock` object to observe. The runtime
verification instead confirms:

- a successful `terraform init` against the `itassetpulse-account` workspace;
- the workspace reports `locked = false` and no active run before starting;
- a successful saved plan (`terraform plan -out=tfplan`);
- the workspace has a finalized current state version after apply;
- a no-op plan (`terraform plan -detailed-exitcode`, exit `0`) — **currently not achievable** while the
  #207 OIDC drift above is open; see that note before treating a non-zero exit code as a regression.

## Order

Preflight (repeated before every apply) → `terraform init` → `terraform plan -out` → review → separate
apply approval → apply. This stack does not depend on `foundation`/`data`/`ecs` (spec §6); future
modifications (e.g., a `budget_limit_usd` change, a different `github_branch`) go through the same
persistent state, no special reordering needed.

The `aws s3api head-bucket` line in the preflight above is historical: it checked the S3 state bucket, which
is no longer the state backend. It stays relevant only for `bootstrap` until #209.

Implemented in: **#173**.

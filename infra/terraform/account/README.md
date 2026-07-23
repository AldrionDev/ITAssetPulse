# stack: account (remote state, persistent)

Persistent account-level guardrails and CI identity that survive demo teardown. Spec: §4.2.
State key: `itassetpulse/global/account.tfstate`.

## What it creates

- `aws_budgets_budget` — monthly cost budget (`budget_limit_usd`), `ACTUAL` alerts at 50/80/100%. A delayed
  cost signal, not a real-time kill switch. No automatic budget actions.
- `aws_sns_topic` + `aws_sns_topic_policy` — shared topic the budget notifies; the policy scopes
  `SNS:Publish` to the `budgets.amazonaws.com` service principal, restricted by `aws:SourceAccount` (this
  account) and `aws:SourceArn` (an account-scoped wildcard budget ARN pattern — see "Budget/SNS dependency
  order" below for why it is not scoped to the specific budget resource).
- `aws_sns_topic_subscription` — one `email` subscription to `budget_notification_email`. Requires a
  one-time manual confirmation (see "SNS email subscription lifecycle" below).
- `aws_iam_openid_connect_provider` for `token.actions.githubusercontent.com` — created only if
  `create_oidc_provider = true`; otherwise data-sourced by URL from an existing provider.
- `aws_iam_role` + `aws_iam_role_policy` — minimal image-publish role assumable via GitHub Actions OIDC,
  scoped to ECR push on `${project_name}-*` repositories.

No IAM resource for the state-access contract, no VPC/ECR/Atlas/ECS/ALB resource, no application code, no
image-publish workflow — all out of scope for this stack.

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

## State-access IAM contract (documentation only — no IAM resource beyond the image-publish role)

Any identity that runs a remote-state stack needs, on the state bucket and its objects, the same S3
state/lock contract documented in `bootstrap/README.md` (§4.1): `s3:ListBucket`; `s3:GetObject` /
`s3:PutObject` on the state object (no `s3:DeleteObject`); `s3:GetObject` / `s3:PutObject` /
`s3:DeleteObject` on the lock object. No KMS permissions (SSE-S3).

## IAM role recreation

Recreating the `image_publish` role (e.g., after an import/recovery or a name change) is **not** guaranteed
to be free of downstream impact:

> Recreating the role with the same name restores the same ARN format, but AWS assigns a new unique
> principal ID. Any resource-based policies or trust relationships that referenced the deleted role must be
> reviewed and, where necessary, updated.

## Recovery / import (remote state lost or corrupted)

The account state lives in S3 (versioned), unlike the bootstrap stack's local state:

1. Preferred: restore a prior **S3 object version** of `itassetpulse/global/account.tfstate`
   (`aws s3api list-object-versions`, then copy the desired version back onto the current key).
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

No dedicated, parallel test observing the short-lived `.tflock` object is required. The runtime
verification instead confirms:

- `use_lockfile = true` in `backend.hcl`;
- a successful remote backend init (`terraform init -backend-config=backend.hcl`);
- a successful saved plan (`terraform plan -out=tfplan`);
- the `itassetpulse/global/account.tfstate` state object exists in the bucket after apply;
- no stale `.tflock` object remains after the operation completes;
- a no-op plan (`terraform plan -detailed-exitcode`, exit `0`).

## Order

Preflight (repeated before every apply) → `terraform init -backend-config=backend.hcl` →
`terraform plan -out` → review → separate apply approval → apply. This stack does not depend on
`foundation`/`data`/`ecs` (spec §6); future modifications (e.g., a `budget_limit_usd` change, a different
`github_branch`) go through the same persistent state, no special reordering needed.

Implemented in: **#173**.

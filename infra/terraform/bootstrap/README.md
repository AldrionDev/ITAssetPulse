# stack: bootstrap (local state, persistent)

Creates **only** the Terraform remote-state infrastructure. Spec: §4.1.

This stack uses **local state** and creates nothing else. Persistent guardrails (Budget, SNS, GitHub OIDC)
live in the `account` stack, not here.

> **Status after #203.** `account`, `foundation`, `data` and `ecs` **no longer use the S3 bucket created
> here** as their active backend — they use HCP Terraform Local execution workspaces, and their
> `backend.hcl` workflow was removed by #203. This stack still uses local state and still owns the bucket,
> which is retained as a historical recovery copy only. Everything below describes that historical model.
> Retiring the bucket and this stack is **#209**.

## What it creates

- `aws_s3_bucket` for remote state, `force_destroy = false` and `lifecycle { prevent_destroy = true }`.
- `aws_s3_bucket_versioning` — `Enabled`.
- `aws_s3_bucket_server_side_encryption_configuration` — SSE-S3 (`AES256`; no KMS).
- `aws_s3_bucket_public_access_block` — all four settings enabled.
- `aws_s3_bucket_ownership_controls` — `BucketOwnerEnforced` (ACLs disabled).

No DynamoDB table: while the four remote-state roots still used this bucket, they locked with the **S3 native
lockfile** (`use_lockfile = true` in their `backend.hcl`), which wrote a `<key>.tflock` object next to each
state key in this same bucket. Since #203 those roots lock through their HCP Terraform workspace instead.

## Inputs / outputs

- Inputs (environment-agnostic): `project_name`, `aws_region`. See `terraform.tfvars.example`.
- Outputs: `state_bucket_name`, `state_bucket_region`. Since #203 these are **historical/recovery context
  only** — do **not** configure `account`, `foundation`, `data` or `ecs` from them. Those roots take their
  backend from the `cloud` block committed in their own `backend.tf`.

### Bucket name

Deterministic: `${project_name}-terraform-state-${account_id}` (account id from `aws_caller_identity`, never
hardcoded). This is a project-stable, strongly collision-resistant convention — but because S3 bucket names
share a global namespace, creation can still fail if another account already reserved the name.

`project_name` is validated to keep the derived name inside the lowercase S3 naming rules (1–34 chars;
lowercase letters, digits, hyphens; starts and ends with a letter or digit; not an S3-reserved prefix such as
`xn--`, `sthree-`, `amzn-s3-demo-`).

## Apply (one-time)

Uses local state — **no `backend.hcl`**.

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars   # then edit (git-ignored)
terraform init
terraform plan
terraform apply
```

Historically, the other stacks then pointed their `backend.hcl` `bucket` at `state_bucket_name`. That step is
**obsolete**: since #203 they use HCP Terraform workspaces and have no `backend.hcl`.

### Back up the local state

After the first successful apply, make an **off-repo, tightly-permissioned backup** of the local
`terraform.tfstate`. State and backup files must **never** be committed to Git (already covered by
`.gitignore`).

## State-access IAM contract (documentation only — no IAM resource is created here)

This stack creates no IAM resource. It documents two identities:

### 1. Bootstrap provisioning identity

Runs the bootstrap `apply`. Requires exactly the bucket create/read/configure actions this configuration
uses (no wildcards):

- `sts:GetCallerIdentity`
- `s3:CreateBucket`, `s3:GetBucketLocation`
- `s3:PutBucketVersioning`, `s3:GetBucketVersioning`
- `s3:PutEncryptionConfiguration`, `s3:GetEncryptionConfiguration`
- `s3:PutBucketPublicAccessBlock`, `s3:GetBucketPublicAccessBlock`
- `s3:PutBucketOwnershipControls`, `s3:GetBucketOwnershipControls`
- `s3:PutBucketTagging`, `s3:GetBucketTagging`

### 2. Downstream backend identity (historical — no longer required)

This contract applied while the four remote-state roots used this bucket. Since #203 they authenticate to
HCP Terraform instead and need no AWS permission for state at all. Kept for recovery context until #209.
On the state bucket and its objects it required:

- `s3:ListBucket` on `arn:aws:s3:::<state-bucket>` (optionally condition-scoped to the relevant key prefixes).
- On the **state object** `arn:aws:s3:::<state-bucket>/<key>`: `s3:GetObject`, `s3:PutObject`. **No
  `s3:DeleteObject` on the state object** — state history is preserved; deletion is a deliberate break-glass
  action.
- On the **lock object** `arn:aws:s3:::<state-bucket>/<key>.tflock`: `s3:GetObject`, `s3:PutObject`,
  `s3:DeleteObject`.
- **No KMS permissions** (encryption is SSE-S3).

## Local bootstrap-state recovery (re-adopt, don't recreate)

The bootstrap state is local and small. If it is lost, **re-adopt** the existing bucket instead of recreating
it (the stable name would collide). Import is a **state-mutating, AWS-access-requiring** recovery operation:

1. Import the bucket resource:
   ```bash
   terraform import aws_s3_bucket.terraform_state <bucket-name>
   ```
2. Import all four related bucket-configuration resources:
   ```bash
   terraform import aws_s3_bucket_versioning.terraform_state <bucket-name>
   terraform import aws_s3_bucket_server_side_encryption_configuration.terraform_state <bucket-name>
   terraform import aws_s3_bucket_public_access_block.terraform_state <bucket-name>
   terraform import aws_s3_bucket_ownership_controls.terraform_state <bucket-name>
   ```
3. After **all** imports, run a full `terraform plan`.
4. Review every proposed change — default or drift differences can produce changes.
5. A no-op plan is the desired end state, not an assumed immediate result.

## Break-glass deletion

`prevent_destroy` is a **Terraform-config-level** protection, not an AWS-side deletion lock. Deliberate
removal is a documented manual procedure:

1. Identify and safely back up every dependent remote state.
2. Remove `prevent_destroy` in a **separately approved** configuration change.
3. Review the full `terraform plan`.
4. Explicitly empty the versioned bucket (all objects and **all versions** — `force_destroy = false` means
   Terraform will not empty it automatically).
5. Run a controlled `terraform destroy`.
6. Document the operation.

Implemented in: **#172**.

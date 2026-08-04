# HCP Terraform Workspace Preparation Runbook

**Issue:** #202 — infra: prepare HCP Terraform project and workspaces
**Depends on:** #201 (closed) — `docs/infrastructure-hcp-jenkins-spec.md`
**Blocks:** #203 — Terraform state migration to HCP Terraform
**Spec:** `docs/infrastructure-hcp-jenkins-spec.md` §6–§10

> Status: EXECUTED (#202) and MIGRATED (#203). The HCP Terraform project and
> all four workspaces described below were created and verified empty under
> #202; §10 records the executed #203 state migration. **HCP Terraform is now
> the active and authoritative state backend** for `account`, `foundation`,
> `data` and `ecs`. The former S3 state objects are retained historical
> recovery copies only and are retired by #209.

---

## 1. Purpose

Prepare HCP Terraform state storage for the `account`, `foundation`,
`data` and `ecs` root stacks before any state migration happens, so #203
can migrate onto workspaces that already exist with the correct execution
mode and remote-state-sharing configuration. This is a zero-state-risk
preparation gate — see §9 for what's explicitly out of scope.

---

## 2. Security & redaction rules

- The HCP Terraform user token is never printed, logged or included in
  this document. Only its storage location and lifecycle are documented
  (§6).
- No AWS account ID, ARN, e-mail address or secret value appears anywhere
  in this document.
- HCP-internal resource IDs (project ID, workspace IDs) are recorded below
  because they are not secrets — they identify objects in an account only
  reachable with the same authenticated token, and are useful for
  reproducibility and API-based verification in #203.

---

## 3. Organization and project

| Item | Value |
|---|---|
| HCP Terraform hostname | `app.terraform.io` (standard HCP Terraform — confirmed **not** HCP Europe) |
| Organization | `gabor-toth-personalprojects` (the only organization accessible to the authenticated token) |
| Plan tier | `free_standard` (not a trial, not Enterprise) |
| Project | `ITAssetPulse` (id `prj-hda39pg96pTh1zgU`) |

The organization was not assumed: the local Terraform CLI had no stored
credential before this issue, so the hostname and organization were
confirmed via an authenticated session before creating anything, and the
token was verified against the HCP Terraform API to return exactly this
one organization.

---

## 4. Workspace inventory

All four workspaces below were created empty, directly under the
`ITAssetPulse` project, and verified read-only afterwards.

| Workspace | Workspace ID | Execution Mode | VCS-connected | Resource count | Current state version |
|---|---|---|---|---|---|
| `itassetpulse-account` | `ws-p2cLCx3DswLR5t9x` | Local | No | 0 | none (404) |
| `itassetpulse-foundation` | `ws-ZVGjvRppPtqAGSKr` | Local | No | 0 | none (404) |
| `itassetpulse-data` | `ws-PQVaE3pH8Qic9wCN` | Local | No | 0 | none (404) |
| `itassetpulse-ecs` | `ws-3pArFC41ix2BE9PS` | Local | No | 0 | none (404) |

All four are **CLI-driven** — no VCS repository is connected to any of
them, matching the target model in spec §7/§8. "Empty" here means: no
current state version exists, nothing was ever uploaded or generated, and
no Terraform run has executed against any of them. This was confirmed via
read-only HCP API calls (`GET /workspaces/:id` and
`GET /workspaces/:id/current-state-version`, the latter returning `404`
for all four) — no `terraform init`, `plan` or `apply` was run against any
repository root to test this.

No `bootstrap` workspace was created, matching spec §8 — the `bootstrap`
stack is retired, not migrated (#209).

---

## 5. Remote-state sharing configuration

**Chosen option: specific-workspace consumers (the narrowest available).**
`global-remote-state` is `false` on all four workspaces — none of them
implicitly shares state with the rest of the organization.

| Producer workspace | Remote-state consumers |
|---|---|
| `itassetpulse-account` | `itassetpulse-ecs` only |
| `itassetpulse-foundation` | `itassetpulse-ecs` only |
| `itassetpulse-data` | `itassetpulse-ecs` only |
| `itassetpulse-ecs` | *(none — shares its state with nobody)* |

This was configured via the HCP Terraform API's
`POST /workspaces/:id/relationships/remote-state-consumers` endpoint,
which grants access to explicitly named workspaces — the narrowest of
the three options in spec §10 (specific workspaces → project-wide →
organization-wide), selected as the least-permissive one available on
the `free_standard` plan.

Two of the initial requests were malformed: an unquoted shell variable
in the request loop word-split, so the request body carried an empty
consumer workspace ID instead of `itassetpulse-ecs`'s actual ID. Both
malformed requests returned successfully but created no consumer
relationship. The requests were repeated with the consumer workspace ID
passed explicitly (no shell interpolation), which produced the
relationships shown in the table above. The final sharing matrix was
verified read-only afterwards (see below); **no broader (project-wide or
organization-wide) sharing fallback was ever enabled**.

Verified read-only afterwards: `GET /workspaces/:id/relationships/remote-state-consumers`
on each of the three producers returns exactly `itassetpulse-ecs`; the
same call on `itassetpulse-ecs` returns an empty list.

---

## 6. Token type, lifecycle and permissions

- **Token type:** HCP Terraform **user token**, created interactively via
  the standard browser-based `terraform login app.terraform.io` flow. No
  team token, organization token, or Jenkins/service-account credential
  was created in this issue — Jenkins authentication is #204/#208 scope.
- **Minimum required permissions:** a user token inherits the underlying
  user account's own organization/team membership — HCP Terraform does
  not offer narrower per-token scoping for user tokens. The account used
  here has direct access to the `gabor-toth-personalprojects` organization
  as its owner, which is sufficient (and unavoidable, being a
  single-person organization) to create the project, workspaces, and
  remote-state-consumer relationships above.
- **Local storage:** the token is written only to
  `~/.terraform.d/credentials.tfrc.json` by the `terraform login` command
  itself. It is not present anywhere in this repository, was never printed
  to a terminal transcript, and is not stored in any environment variable
  that persists beyond the local shell.
- **Future Jenkins token:** a separate credential will be issued for the
  local Jenkins instance in #204/#208 and stored only in the Jenkins
  credential store — never derived from or identical to this user token.
- **Rotation / revocation:** from the HCP Terraform UI, under the user's
  own Account settings → Tokens, the existing token can be revoked at any
  time; a new one is obtained by re-running
  `terraform login app.terraform.io`, which overwrites the stored
  credential locally. Revoking the token immediately invalidates any
  cached copy, local or otherwise.

---

## 7. Verification procedure

All checks below are read-only against the HCP Terraform API, using the
locally stored credential. `<token>` is a placeholder throughout — the
real token must never be placed in shell history, command-line/process
arguments, or command output. Read it with a safe local helper instead
(for example, a shell function that pipes `credentials.tfrc.json`
straight into `jq` and exports the result to an environment variable
without echoing it), and never `cat` or otherwise print
`~/.terraform.d/credentials.tfrc.json` itself.

```bash
# Organization reachable with this token (name only)
curl -s --header "Authorization: Bearer <token>" --header "Accept: application/vnd.api+json" \
  https://app.terraform.io/api/v2/organizations | jq -r '.data[].attributes.name'

# Exactly four workspaces in the ITAssetPulse project
curl -s --header "Authorization: Bearer <token>" --header "Accept: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/gabor-toth-personalprojects/workspaces?filter%5Bproject%5D%5Bid%5D=<project-id>" \
  | jq '{count: (.data|length), names: [.data[].attributes.name]}'

# Per workspace: execution mode, VCS link, resource count, state version, consumers
curl -s --header "Authorization: Bearer <token>" --header "Accept: application/vnd.api+json" \
  https://app.terraform.io/api/v2/workspaces/<workspace-id> \
  | jq '.data.attributes | {"execution-mode","global-remote-state","vcs-repo","resource-count"}'
curl -s -o /dev/null -w "%{http_code}\n" --header "Authorization: Bearer <token>" \
  https://app.terraform.io/api/v2/workspaces/<workspace-id>/current-state-version   # expect 404
curl -s --header "Authorization: Bearer <token>" --header "Accept: application/vnd.api+json" \
  https://app.terraform.io/api/v2/workspaces/<workspace-id>/relationships/remote-state-consumers
```

Locally: `terraform login app.terraform.io` reports success; no token
value appears in this repository (`git grep` for the credentials filename
or token patterns returns nothing); only this file and
`infra/terraform/README.md` changed.

---

## 8. Rollback procedure

Because every workspace is empty and CLI-driven (no state, no run
history, no VCS connection), rollback is low-risk and does not touch AWS:

1. Remove remote-state-consumer grants (optional — deleting the workspace
   removes them implicitly):
   `DELETE /workspaces/:id/relationships/remote-state-consumers` with the
   consumer's ID in the body, on each of the three producers.
2. Delete the four workspaces:
   `DELETE /workspaces/:id` for `itassetpulse-account`,
   `itassetpulse-foundation`, `itassetpulse-data`, `itassetpulse-ecs`.
3. Delete the `ITAssetPulse` project:
   `DELETE /organizations/gabor-toth-personalprojects/projects/<project-id>`.
4. Optionally revoke the user token from the HCP Terraform UI (§6).

No AWS resource, GitHub workflow, or repository file (other than this
runbook and the README pointer) needs to be touched to roll this back.

---

## 9. Explicit non-goals of #202

These were the boundaries of #202 only. #203 (§10) subsequently performed the
state migration.

- **#202 migrated, uploaded or generated no Terraform state.** All four
  workspaces were empty on completion of that issue.
- #202 modified no `.tf` file.
- No AWS resource was created, changed or read.
- No Jenkins configuration or credential was created.
- No GitHub Actions workflow, secret, or variable was touched.

---

## 10. Executed migration record (#203)

| Item | Value |
|---|---|
| Migration date | 2026-08-03 |
| Issue | #203 — *infra: migrate Terraform state to HCP Terraform* |
| Branch | `infra/203-migrate-state-to-hcp-terraform` |
| Configuration commit 1 | `b33a5e05cae4ffe1697cfb17e6bb3ed6176f3314` — *refactor(infra): replace S3 backend with HCP Terraform cloud blocks* |
| Configuration commit 2 | `de9f9c42c35b99458df3e02ea9917992c8d615d7` — *refactor(infra): read upstream state from HCP Terraform workspaces* |
| Terraform CLI | **1.10.5**, pinned deliberately so the issue changed the backend only and did not smuggle in a CLI or state-format upgrade. The locally installed 1.15.7 was not used for any state-touching command. |
| Release checksum | `terraform_1.10.5_linux_amd64.zip` SHA-256 `0566a24f5332098b15716ebc394be503f4094acba5ba529bf5eb0698ed5e2a90`, verified against HashiCorp's published `SHA256SUMS` before the binary was extracted or executed |

### 10.1 Workspace mapping

| Root | HCP workspace | Execution mode | Outcome |
|---|---|---|---|
| `account` | `itassetpulse-account` | Local | State migrated (the only non-empty state) |
| `foundation` | `itassetpulse-foundation` | Local | Clean initialization; no state snapshot |
| `data` | `itassetpulse-data` | Local | Clean initialization; no state snapshot |
| `ecs` | `itassetpulse-ecs` | Local | Clean initialization; no state snapshot |
| `bootstrap` | — | — | **Not migrated.** Keeps local state; retired by #209 |

### 10.2 Account state baseline — seven managed resources

The verified pre-migration state held **seven** managed resources and **five**
data-source addresses. All seven were migrated unchanged:

```text
aws_budgets_budget.monthly_cost
aws_iam_openid_connect_provider.github_actions[0]
aws_iam_role.image_publish
aws_iam_role_policy.image_publish
aws_sns_topic.budget_alerts
aws_sns_topic_policy.budget_alerts
aws_sns_topic_subscription.budget_alerts_email
```

Data sources (supporting evidence, not part of the acceptance count):
`data.aws_caller_identity.current`, three `data.aws_iam_policy_document.*`,
`data.aws_partition.current`.

> **Historical correction.** #203's issue body, `docs/infrastructure-hcp-jenkins-spec.md` §8 and the
> #201/#202 documents all stated *six* managed resources. That was a planning assumption inherited from
> #201 and never checked against the real state. The #203 Gate 4 preflight read the state and found
> **seven** — the extra address is `aws_iam_openid_connect_provider.github_actions[0]`, present because the
> real (git-ignored) `account/terraform.tfvars` keeps `create_oidc_provider = true`. The GitHub OIDC
> provider was a legitimate managed member of the state throughout #203 and was **preserved unchanged**.
> **#203 did not remove it**; its removal belongs to **#207**.

### 10.3 Migration metadata semantics

The migration used the official HCP Terraform CLI workflow: the `backend "s3" {}`
block was replaced by a `cloud` block, the previous `.terraform/` metadata was
kept, and a plain `terraform init -lockfile=readonly` detected the change and
interactively offered to copy the state. No `-migrate-state`, `-force-copy` or
`-reconfigure` was used.

| Observation | State format | Writer Terraform version | Managed count | Serial |
|---|---|---|---|---|
| Source (S3), pre-migration | 4 | 1.10.5 | 7 | 3 |
| Initial HCP observation | 4 | 1.10.5 | 7 | 1 (HCP workspace serial) |

- The source and HCP lineages **differed**: HCP Terraform established a new
  workspace-local lineage for the previously empty workspace. Lineage values are
  recorded in protected out-of-repository evidence, not here.
- The HCP lineage remained **stable across every later HCP observation**, and the
  HCP serial was **non-decreasing** throughout.
- **Cross-backend lineage equality and continuation of the source serial were
  removed as acceptance assumptions** — they are not part of what the CLI
  migration workflow promises. The migration copies the latest state snapshot; it
  does not carry the source backend's state-history identity across.
- The HCP API defines serial as the state-version sequence *within* the
  workspace, so serial `1` is correct for the first state version in a previously
  empty workspace.

Do not compare the S3 serial numerically against the HCP serial, and do not
require the two lineages to match.

### 10.4 Account plan result — migration integrity vs. pre-existing AWS drift

These are two separate findings and must not be conflated.

**Migration integrity: passed.**

- Sorted managed-resource address lists identical before and after (7 = 7).
- Data-source address lists identical (5 = 5).
- `terraform validate` succeeded.
- No state mutation was caused by any verification step.

**Pre-existing AWS drift: detected, deferred to #207.**

- `terraform plan -detailed-exitcode` returned **exit code `2`**. This account
  plan is **not** a no-op, and #203 does **not** claim `exit 0`.
- The exit code was **not caused by the backend migration**. The same plan would
  have produced it against the S3 backend.
- The AWS refresh found that `aws_iam_openid_connect_provider.github_actions[0]`
  is **already absent from AWS** — it was removed out-of-band.
- Configuration and state still intentionally contain that resource, so Terraform
  proposed **re-creating** it, plus an **in-place update** of the dependent
  `aws_iam_role.image_publish` (whose trust policy depends on the provider ARN).
- **No destroy and no replacement** was proposed. No unrelated resource change
  was identified.
- **No apply was run.** #203 must not re-create the OIDC provider.
- #207 resolves this by removing the resource from the configuration, which is
  also what milestone #25's exit criteria require.

### 10.5 Empty-root initialization

The old S3 states for `foundation`, `data` and `ecs` were each verified to hold
**zero** state addresses *before* the backend configuration changed. Each root was
then cleanly initialized against its HCP workspace — no state migration was
attempted, because there was nothing to move.

| Root | `init` | `validate` | HCP resource count | HCP state versions | `state list` |
|---|---|---|---|---|---|
| `foundation` | exit 0 | Success | 0 | 0 | exit 1, `No state file was found!` |
| `data` | exit 0 | Success | 0 | 0 | exit 1, `No state file was found!` |
| `ecs` | exit 0 | Success | 0 | 0 | exit 1, `No state file was found!` |

No migration, rename or workspace-selection prompt appeared for any root.

> **Empty snapshot vs. no snapshot.** Against the S3 backend these roots had an
> *empty state object*, so `terraform state list` exited `0` and printed nothing.
> An HCP workspace that has never had a run has **no state version at all**, which
> Terraform reports as `No state file was found!` with exit `1`. That is a
> stronger form of empty, and it was accepted as such: **no artificial empty state
> was uploaded or created**. A future real `terraform apply` will create the first
> state version. (For contrast, `account` — which does have a state version —
> returns exit `0`.)

### 10.6 ECS remote-state verification

Verification history, kept because two earlier probes were inconclusive for
instructive reasons:

1. **Plain `terraform console`** returned `(known after apply)`. Inconclusive:
   the ECS workspace has no state, so the data source had never been evaluated
   and console does not resolve it on demand.
2. **First targeted-plan extraction** read only
   `data.terraform_remote_state.account` successfully, but its JSON filter
   inspected `planned_values` — empty here, because the targeted read-only plan
   creates no persistent planned root resource.
3. **Accepted verification (Gate 8C).** A targeted plan evaluated **exactly one**
   data source, `data.terraform_remote_state.account`:
   - plan exit code `0`, no error of any class;
   - **no AWS credentials were available** (blanked environment, empty
     credentials/config files, IMDS disabled);
   - no `foundation`, `data`, AWS, Atlas, managed-resource or unrelated
     data-source read occurred;
   - the refreshed `prior_state` contained exactly one matching
     `terraform_remote_state` data source;
   - its root-output map contains the **`sns_topic_arn` key**;
   - the output **value** was never selected, displayed or persisted;
   - managed-resource change count `0`; unrelated data-source change count `0`;
   - no ECS state version was created;
   - the temporary binary plan was protected (mode 600, outside the repository)
     and deleted immediately after extraction; it was never applied or committed.

**Functional Local-execution remote-state access is verified.** Two qualifications:

- The HCP consumer matrix (§5) separately proves the intended ECS-only sharing
  configuration.
- In Local execution mode the authenticated user token *also* holds workspace
  permissions, so this local functional read must **not** be presented as
  isolated proof that the consumer grant alone enforced access.

For `foundation` and `data`, the exact ECS-only consumer grants are verified, but
**no output read is possible** until those roots have real state snapshots and
outputs.

### 10.7 CI reproduction

All six Terraform CI-equivalent jobs were reproduced locally in a disposable
clone of the committed branch, with a cleared environment and an empty `HOME` —
no AWS and no HCP Terraform credential was reachable. All `fmt -check`,
`init -backend=false` and `validate` commands passed, confirming that
`-backend=false` skips *HCP Terraform* initialization just as it skips a
backend.

- **No tracked file changed** in the clone.
- The only untracked result was a generated
  `infra/terraform/modules/ecs-fargate-service/.terraform.lock.hcl`. That module
  has **no tracked lock file**, which is why its CI job deliberately omits
  `-lockfile=readonly`. A byte-identical file (SHA-256
  `b71a0a8adf9feafdc24fdd5985c5722b8ec8bc145bf245c53e161c105e6298a7`) was
  generated from the **untouched baseline commit** `5be6a71`, so the behaviour
  predates #203 and is unrelated to it. The clone's `git status` was therefore
  not entirely empty, and this record does not claim it was.
- The disposable clone was deleted.
- `.github/workflows/ci.yml` was **not** modified.

At the time of writing, only this local credential-free reproduction has run;
the GitHub Actions result is not yet recorded.

### 10.8 Tracked lock-file integrity

The tracked lock-file inventory (`git ls-files 'infra/terraform/**/.terraform.lock.hcl'`)
was recorded at preflight and every file was verified unchanged at every gate.
Every `terraform init` in this issue used `-lockfile=readonly`, so lock-file
churn would have failed the command rather than silently rewriting a tracked file.

### 10.9 Cleanup and legacy-plan retirement

- The four tracked `backend.hcl.example` files were deleted in configuration
  commit 1.
- The four git-ignored real `backend.hcl` files were each verified byte-identical
  to a protected out-of-repository backup, then deleted. Their contents were never
  displayed or parsed. No `backend.hcl` remains anywhere in the repository.
- The two legacy saved plans matched their expected sizes and SHA-256 hashes
  exactly:

| Plan | Size | SHA-256 |
|---|---|---|
| `infra/terraform/foundation/gate-b-foundation-apply.tfplan` | 14267 | `629947b6fdbdca3ba102569a592beb03820d8b6e0561fc4b43234af3323a30b5` |
| `infra/terraform/account/gate-oidc-recovery-account.tfplan` | 18354 | `ce2257d8501dc4eb78e7f9f39cb54e2fc9c6007429e00db92f61f0211ad955c2` |

  Their metadata was recorded in an evidence comment on issue #203, after which
  both files were deleted. Neither plan was displayed, interpreted, applied,
  regenerated, renamed or copied — only `stat` and `sha256sum` touched them.
- The protected backend-configuration and pre-migration local-backend-metadata
  backups are retained temporarily, outside the repository, until #203 merges.

### 10.10 No AWS infrastructure mutation

**No AWS resource was created, modified or destroyed by #203.** The issue changed
where Terraform state is stored, nothing about what exists in AWS. The only AWS
interactions were reads: the pre-migration state read, `sts get-caller-identity`,
and the provider refresh during `terraform plan`. No `apply`, `destroy`,
`import`, `state push`, `state rm`, `state mv`, `force-unlock`, `-force-copy` or
`-reconfigure` was run at any point. No MongoDB Atlas call was made.

### 10.11 State authority

Since the `account` migration passed its integrity checks:

- **HCP Terraform is the single active and authoritative backend** for `account`,
  `foundation`, `data` and `ecs`.
- The S3 state objects are **retained historical recovery copies only**. They were
  not read or written by any command after the migration and remain untouched.
- Retiring the S3 bucket and the `bootstrap` stack is **#209**.

### 10.12 Next steps

- **#207** — remove the superseded GitHub Actions OIDC provider and the old
  image-publish path, resolving the drift recorded in §10.4.
- **#205, #208, #200** — unblocked by this migration.
- **#209** — retire the S3 state bucket and the `bootstrap` stack after the
  rebuild in #200 proves the new model.

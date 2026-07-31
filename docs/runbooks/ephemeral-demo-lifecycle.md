# Ephemeral Demo Lifecycle Runbook

**Issue:** #182 — End-to-end ephemeral demo verification and runbook
**Depends on:** #181 (closed, merged via PR #197)
**Blocks:** #183 (remains blocked until #182 is confirmed CLOSED — see §14)
**Follow-up:** #198 — shared-ownership tag drift on the account-global GitHub
Actions OIDC provider, discovered during Gate K, tracked and resolved
independently of this issue (see §15, Gate K).
**Spec:** `docs/infrastructure-modularization-spec.md` §10.4, §11, §12, §13, §14

> Status: EXECUTED. The full apply → current-release deploy → rollback
> deploy → teardown → final-inventory lifecycle described below has been run
> once, end to end, and every gate's `EVIDENCE:` block in §15 records that
> run's actual result. The procedure sections (§1–§13) remain generic and
> reusable for a future run; PR review and merge are still pending (see
> §14) — #182 is not yet closed.

---

## 1. Purpose

Prove, end to end and with real evidence, that the modular ITAssetPulse demo
infrastructure can be deployed from a clean baseline, serve traffic, roll
back to a previous release, and be fully torn down — leaving only the
persistent `bootstrap`/`account` layer — per spec §13/§14. This document is
both the executable procedure and the record of that proof.

**Out of scope:** application code changes (covered by separate PRs, e.g.
#178/#180/#181), removing superseded workflow/doc paths (#183, blocked on
this issue), and any change to `bootstrap`/`account` beyond the explicitly
reviewed OIDC drift reconciliation in Gate B.

---

## 2. Stack classification

| Stack | Lifecycle | Notes |
|---|---|---|
| `bootstrap` | **persistent** | Terraform state S3 bucket. Never destroyed by this runbook. |
| `account` | **persistent** | Budget, SNS, GitHub OIDC provider, image-publish role. Never destroyed by this runbook — only drift-reconciled (Gate B). |
| `foundation` | **ephemeral** | VPC + both ECR repos. Destroyed and recreated as part of proving the lifecycle. |
| `data` | **ephemeral** | Atlas DB user + Secrets Manager secret. Destroyed and recreated. |
| `ecs` | **ephemeral** | Cluster/ALB/services. Deployed, redeployed (rollback), then destroyed. |

---

## 3. Security & redaction rules

- Never print: AWS account ID, full ARNs (redact the account-id segment),
  Atlas project ID, access keys, session tokens, Atlas Client ID/Secret,
  connection strings, or any live public IP beyond what's needed to prove
  the allow-list step (record IPs as `<TASK_PUBLIC_IP>` placeholders in this
  document; real values only ever live in command output during execution,
  not committed here).
- Credential checks report **presence only** (`SET`/`UNSET`), never values.
- Every command snippet below uses placeholders (`<...>`) for anything
  environment- or run-specific. Do not commit real values into this file.

---

## 4. Prerequisites & required tools

- `git`, `gh`, `aws` (CLI v2), `terraform` (~1.10, matches CI's
  `terraform_wrapper: false` pin), `docker` — versions recorded at Gate 0
  discovery time; re-verify before a live run if much time has passed.
- AWS credentials for the account hosting the `demo` environment, scoped to
  the stacks being touched.
- MongoDB Atlas Service Account credentials (`MONGODB_ATLAS_CLIENT_ID` /
  `MONGODB_ATLAS_CLIENT_SECRET`).
- `gh` authenticated against this repository with permission to view issues,
  dispatch workflows, and open/merge PRs.

---

## 5. Required ignored runtime files

Per stack, a real (gitignored) `backend.hcl` and, where applicable, real
`environments/demo/*.tfvars` must already exist locally — these are never
committed (see `.gitignore`: `backend.hcl`, `*.tfvars` with
`!*.tfvars.example`, `**/.terraform/*`, `*.tfstate*`). This runbook assumes
they are already in place; it does not create or copy them.

```bash
# Presence-only check, never print contents:
for stack in account data ecs foundation; do
  [ -f "infra/terraform/$stack/backend.hcl" ] && echo "$stack: backend.hcl present" || echo "$stack: MISSING backend.hcl"
done
for f in foundation data ecs; do
  [ -f "infra/terraform/environments/demo/$f.tfvars" ] && echo "$f.tfvars present" || echo "MISSING $f.tfvars"
done
```

---

## 6. Credential-presence checks (values never printed)

```bash
for v in AWS_PROFILE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_REGION \
         MONGODB_ATLAS_CLIENT_ID MONGODB_ATLAS_CLIENT_SECRET; do
  if [ -n "${!v}" ]; then echo "$v: SET"; else echo "$v: UNSET"; fi
done
aws sts get-caller-identity --query 'Arn' --output text | sed -E 's/[0-9]{12}/<REDACTED_ACCOUNT_ID>/'
```

---

## 7. Saved Terraform plan workflow (used for every mutating apply/destroy)

Every Terraform mutation in this runbook — on any stack — follows this
exact sequence. No stack is ever applied from an unreviewed/unsaved plan.

```bash
# From the stack directory, e.g. infra/terraform/<stack>/
terraform plan -out=/tmp/<stack>-<gate>.tfplan \
  ${TF_VAR_ARGS:-}                      # e.g. -var release_sha=<SHA> for ecs
chmod 600 /tmp/<stack>-<gate>.tfplan

# Human review — resource-address summary, not just the human-readable diff:
terraform show -json /tmp/<stack>-<gate>.tfplan \
  | jq -r '.resource_changes[] | "\(.change.actions | join(",")) \(.address)"'
terraform show /tmp/<stack>-<gate>.tfplan   # full readable review

# --- STOP: present the exact resource-address summary for explicit approval ---
# --- only continue past this point after explicit approval is recorded ---

terraform apply /tmp/<stack>-<gate>.tfplan   # apply ONLY the reviewed saved plan
rm -f /tmp/<stack>-<gate>.tfplan             # delete only after apply completes + evidence captured

terraform state list                          # post-apply verification
```

**Lesson from Gate J (ECS destroy):** a saved-plan apply must run in a
background-capable process (e.g. `nohup … & disown`, monitored by polling
its log/PID) and must **never** be wrapped in a short external command
timeout. A 5-minute tool timeout interrupted an in-flight `ecs destroy`
apply mid-way, producing a genuine partial completion (Terraform received
an interrupt, not an AWS failure). Recovery required capturing exact
live-resource evidence, then creating and reviewing a **fresh** recovery
plan — never rerunning the consumed one. See Gate J's evidence in §15 for
the full account.

---

## 8. Atlas temporary access-list entry requirements

Every entry this lifecycle creates:

- exact `/32` (never a wider range);
- `deleteAfterDate` set (Atlas-enforced expiry, belt-and-suspenders with
  manual removal);
- unique comment: `ITAssetPulse #182 release_sha=<SHA> phase=<phase>`
  (phase ∈ `release-deploy`, `rollback`);
- existence verified by a GET immediately after creation;
- removal verified by a GET after the associated ECS task has fully drained
  or during teardown.

```bash
# Create (illustrative — real calls go through the Atlas Admin API or `atlas` CLI):
atlas accessLists create <TASK_PUBLIC_IP>/32 \
  --projectId <ATLAS_PROJECT_ID> \
  --comment "ITAssetPulse #182 release_sha=<SHA> phase=<phase>" \
  --deleteAfterDate "<ISO8601_TIMESTAMP>"

# Verify:
atlas accessLists list --projectId <ATLAS_PROJECT_ID> \
  | grep -F "<TASK_PUBLIC_IP>/32"

# Remove + verify absence:
atlas accessLists delete <TASK_PUBLIC_IP>/32 --projectId <ATLAS_PROJECT_ID> --force
atlas accessLists list --projectId <ATLAS_PROJECT_ID> | grep -F "<TASK_PUBLIC_IP>/32" \
  && echo "STILL PRESENT — investigate" || echo "confirmed removed"
```

**Lesson from Gate H:** the Atlas access-list `comment` field has an
**80-character limit**. A full-length comment
(`ITAssetPulse #182 release_sha=<40-char-SHA> phase=release-deploy`, 91
bytes) was rejected with HTTP `400 INVALID_NETWORK_PERMISSION_COMMENT`
before any entry was created (no partial entry, no cleanup needed). Always
validate comment byte length **before** the POST, using a shortened SHA
prefix if needed, e.g. `ITAssetPulse #182 sha=<8-char-prefix>
phase=<phase>` (51 bytes). Do not retry automatically on a `400` — re-GET
first to confirm nothing partial was created, then retry only with an
explicitly re-approved, corrected comment.

Old task entries must remain until the replacement task is healthy and the
old task's ENI is fully retired (§9); a lifecycle entry is only removed
once its task and public IP are no longer active.

---

## 9. Concurrent ECS apply + Atlas allow-list workflow (Gates H, I)

The backend ECS task cannot pass its target-group health check — so the
reviewed `terraform apply` cannot reach steady state — until its IP is
Atlas-allow-listed. The apply and the allow-list creation therefore run
**concurrently**, not sequentially:

```bash
# Terminal A — start the reviewed apply, do not wait for it before continuing:
terraform apply /tmp/ecs-<gate>.tfplan &
APPLY_PID=$!

# Terminal B — poll for the new backend task while A is running:
CLUSTER=<ecs_cluster_name>
SERVICE=<backend_service_name>
for i in $(seq 1 <BOUNDED_ATTEMPTS>); do
  TASK_ARN=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" \
    --desired-status RUNNING --query 'taskArns[0]' --output text)
  [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ] && break
  sleep <POLL_INTERVAL_SECONDS>
done
# If no task appeared within <BOUNDED_ATTEMPTS> — ABORT (see recovery below).

ENI_ID=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
TASK_PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids "$ENI_ID" \
  --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
# If no public IP is ever assigned — ABORT (see recovery below).

# --- STOP: present the exact /32, comment, and deleteAfterDate for a SEPARATE,
#           explicit Atlas-mutation approval (not covered by the apply approval) ---

# create + verify the Atlas entry (§8), then continue monitoring:
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE"
wait "$APPLY_PID"; APPLY_EXIT=$?
echo "terraform apply exit status: $APPLY_EXIT"
# Only after apply succeeds and evidence is captured: rm -f /tmp/ecs-<gate>.tfplan
```

### Abort conditions

- no backend task appears within the bounded polling window;
- a task starts but is never assigned a public IP;
- `terraform apply` exits (success or failure) before the Atlas entry could
  be created;
- the service fails to stabilize even after the allow-list entry is
  confirmed present.

### Compensating failure cleanup

If a lifecycle-created Atlas entry exists but the associated apply fails or
cannot stabilize:

1. remove the entry created **in this gate only** and verify removal by GET;
2. preserve any entry still required by a previously healthy task;
3. capture Terraform state, ECS service/task status, target-group health,
   and task logs before anything else;
4. do **not** blindly rerun `apply` or `destroy` — recovery requires a
   fresh saved plan and a fresh, explicit re-approval;
5. delete the failed apply's saved plan file only after the above evidence
   is captured.

During the rollback deploy (Gate I) specifically: never remove the release
deploy's (Gate H's) Atlas entry until the rollback task is confirmed
healthy and the Gate H task is fully drained.

---

## 10. Release-freeze rules (Gate F)

```bash
git fetch origin
CURRENT_RELEASE_SHA=$(git rev-parse origin/main)
[ "${#CURRENT_RELEASE_SHA}" -eq 40 ] || echo "NOT A FULL SHA — abort"

# CURRENT_RELEASE_SHA is exactly fresh origin/main. No substitution, no
# fallback to an older ancestor is permitted for this value.
git diff --stat "$CURRENT_RELEASE_SHA" -- backend/ frontend/  # revalidate container/health/ALB readiness
# If fresh origin/main lacks the required container/`/health`/Nginx/ALB
# changes -> BLOCKER, stop. Do not substitute an older commit.

ROLLBACK_SHA=<candidate, e.g. the last commit known to have introduced ALB/health readiness>
git merge-base --is-ancestor "$ROLLBACK_SHA" "$CURRENT_RELEASE_SHA" \
  && echo "ROLLBACK_SHA is an ancestor of CURRENT_RELEASE_SHA" \
  || echo "NOT an ancestor — abort"
```

Once frozen, `CURRENT_RELEASE_SHA` and `ROLLBACK_SHA` are used **verbatim**
for every later gate. If `origin/main` advances again before teardown
completes, the frozen values are not silently updated.

---

## 11. Teardown order

`ecs destroy` (while rollback is active) → remove/verify rollback's Atlas
entry → `data destroy` (Atlas DB user + Secrets Manager secret/version) →
`foundation destroy` (VPC + both ECR repos). See Gate J.

---

## 12. Final inventory: residual classification & bounded polling

- **Allowed residuals (not blockers):** deregistered `INACTIVE` ECS
  task-definition revisions; historical CloudWatch metric data.
- **Required absent:** ECS clusters/services/running tasks; ALBs,
  listeners, rules, target groups; project ECS/ALB security groups;
  application ENIs; VPC/subnets/route tables/IGW; both ECR repositories;
  project-scoped log groups, alarms, dashboards; every Atlas `/32` entry
  this lifecycle created.
- **Secrets Manager (tightened):** bounded polling covers deletion
  *visibility* lag only. An ITAssetPulse demo secret still active or
  pending-deletion after the bounded window is a **final-inventory
  failure** (Gate D's `recovery_window_in_days = 0` precondition should
  have made this immediate) — not an allowed residual.
- **Must persist:** `bootstrap`/`account` resources, including the Gate
  B-reconciled GitHub OIDC provider.

```bash
for i in $(seq 1 <MAX_ATTEMPTS>); do
  # re-check target resource; break on expected empty/absent result
  sleep <POLL_INTERVAL_SECONDS>
done
```

---

## 13. AWS terminal-state and deletion-semantics notes

Operational knowledge that avoids misreading a healthy teardown as a leak,
or a genuine leak as expected residue:

- **ECS services and task definitions:** a deleted, named ECS service
  remains queryable via `describe-services` as status `INACTIVE` with
  `0/0/0` counts — it does not disappear. Deregistered task-definition
  revisions behave the same way (`INACTIVE`, not absent). Both are expected
  historical records, not live resources; do not treat them as a teardown
  failure.
- **Fargate ENI cleanup lag:** ENI detachment on task stop can lag task
  termination by tens of seconds. A task's Atlas `/32` entry must not be
  removed until the ENI is detached/absent **and** its public IP shows zero
  associated ENIs — not merely until the task shows `STOPPED`.
- **CloudWatch metrics:** historical metric data may remain queryable after
  the alarm/dashboard/log-group resources that produced it are gone. This
  is not a provisioned resource and is not a residual to chase.
- **ECR (`force_delete = true`):** the foundation stack's repositories use
  `force_delete = true` so Terraform can delete a non-empty repository.
  Destroying the repository **intentionally** removes every image and tag
  it contains, including any frozen release tag — this is expected, not a
  data-loss bug. A future run must republish both frozen SHAs after the
  next `foundation apply`, never assume a pre-teardown tag still exists.
- **Secrets Manager (`recovery_window_in_days = 0`):** both the ECS JWT
  secret and the data-stack MongoDB URI secret use immediate deletion.
  Destroying `aws_secretsmanager_secret_version` alone only removes
  Terraform's own tracking of that version — the live value is not gone
  until the **parent** `aws_secretsmanager_secret` is destroyed. A
  successful teardown must show the secret fully absent
  (`ResourceNotFoundException`, including with `--include-planned-deletion`)
  — a secret still visible as pending-deletion after the bounded polling
  window is a real failure, not something to wait out further.

---

## 14. PR & issue-closure requirements

- The PR body **must** contain the literal line `Closes #182`.
- Merge only after CI is green and explicit merge approval is given.
- After merge, verify #182 is actually **CLOSED** — if auto-close via
  `Closes #182` did not fire, request separate explicit approval before
  manually closing it.
- Only after #182 is confirmed closed: record #183 as unblocked. Opening
  the PR alone never unblocks #183.

---

## 15. Gate log

Each gate: scope, exact/placeholder commands, expected evidence, abort/
recovery conditions, and an evidence block filled in during execution.

### Gate A — Runbook scaffold
- Scope: create branch, create this file, review diff, commit only after
  explicit approval.
- Classification: local git/filesystem mutation only, no cloud mutation.
- **EVIDENCE:** branch `docs/182-ephemeral-demo-e2e-runbook` created; this
  file created as a scaffold and committed as
  `c87fb32baeafad079c6f7831431457fc1509987a`
  (`docs: add ephemeral demo lifecycle runbook scaffold`) after explicit
  approval. This is the fixed reference point every later gate re-verified
  against.

### Gate B — `account` drift reconciliation + persistent-layer verification
- Scope: saved-plan reconcile the missing GitHub OIDC provider on
  `account`; then fresh `account` plan must show no changes; read-only
  `bootstrap` plan must show no changes; verify state bucket, Budget, SNS
  topic/subscription, OIDC provider, image-publish role.
- **EVIDENCE:** the missing `aws_iam_openid_connect_provider.github_actions[0]`
  was recreated via a reviewed, approved saved-plan apply (`1 added`). A
  fresh `account` plan immediately afterward showed no changes, as did a
  read-only `bootstrap` plan. State bucket, Budget, SNS topic/subscription,
  OIDC provider, and image-publish role were all confirmed present. **Note:**
  this no-drift state did not hold for the remainder of the lifecycle — see
  Gate K, where the same provider's *tags* (not its function) were found
  drifted again by an external, unrelated process (tracked in #198).

### Gate C — Atlas pre-deployment reconciliation
- Scope: resolve the `0.0.0.0/0` entry (delete unless a legitimate
  dependency is found) and the stale `13.60.201.215/32` (issue #180
  residue) with an explicit keep/delete decision — before any ECS
  deployment.
- **EVIDENCE:** no legitimate dependency on `0.0.0.0/0` was found; it was
  deleted and GET-verified absent, as was the stale issue-#180 residue
  `13.60.201.215/32` (no matching NAT/EIP existed). The three unrelated
  pre-existing `/32` entries were preserved unchanged throughout.

### Gate D — Baseline cleanup: destroy `data`, then `foundation`
- Scope: mandatory precondition check (`recovery_window_in_days = 0` on
  the Secrets Manager resource) before proposing the destroy plan; then
  saved-plan destroy of `data`, then `foundation`.
- **EVIDENCE:** precondition confirmed (`recovery_window_in_days = 0` set
  on `aws_secretsmanager_secret.mongo_uri`). `data` destroyed via a
  reviewed saved plan (4 deletes: secret, secret version, Atlas database
  user, generated password). `foundation` destroyed via a reviewed saved
  plan (16 deletes: VPC, 4 subnets, IGW, 2 route tables, 4 associations, 2
  ECR repositories, 2 lifecycle policies — removing both then-published
  image tags along with the repositories, as intended). Post-destroy state
  reached the true `bootstrap`/`account`-only baseline.

### Gate E — Fresh apply: `foundation`, then `data`
- **EVIDENCE:** `foundation` recreated (new VPC + two empty ECR
  repositories) via a reviewed saved-plan apply. `data` recreated (new
  Atlas database user + new Secrets Manager secret) via a reviewed
  saved-plan apply; no sensitive value (password, connection string) was
  ever printed during creation or verification.

### Gate F — Release-freeze checkpoint
- **EVIDENCE:** frozen from fresh `origin/main`:
  - **Current release:** `3cb1a2a90aebd085b2982eb366acbd16c7143c50`
  - **Rollback release:** `48df354e3a301482b736c784fd1c53fec751b8ce`

  `CURRENT_RELEASE_SHA` is the exact fresh `origin/main` HEAD at freeze
  time — no substitution. `ROLLBACK_SHA` was confirmed an ancestor of
  `CURRENT_RELEASE_SHA`. No commit on the documentation feature branch
  (`docs/182-ephemeral-demo-e2e-runbook`) was ever used as, or treated as,
  an image release — both frozen SHAs come from `main`. Both backend and
  frontend images were published under full-commit-SHA tags in both ECR
  repositories (never a short tag or `latest`). Because no second
  app-code-changing commit existed between the two frozen SHAs, current
  and rollback shared identical application behavior — Gate I therefore
  validated the rollback *mechanics* (new task, new ENI/IP, Atlas
  re-allow-list, drain of the old task) rather than a user-visible feature
  difference. This is a documented limitation of this particular run, not
  a defect in the procedure.

### Gate G — Publish both frozen SHAs and verify
- Scope: dispatch `publish-images.yml` for `CURRENT_RELEASE_SHA` and
  `ROLLBACK_SHA`; verify both tags exist in both ECR repos.
- **EVIDENCE:** current-release publish workflow run `30586103923`
  completed successfully (`ref: 3cb1a2a90aebd085b2982eb366acbd16c7143c50`).
  Rollback publish workflow run `30586538902` completed successfully
  (`ref: 48df354e3a301482b736c784fd1c53fec751b8ce`). Both full-SHA tags
  were verified present in both the backend and frontend ECR repositories
  before proceeding to Gate H.

### Gate H — Deploy and verify the current release
- Scope: concurrent apply + Atlas allow-list workflow (§9) with
  `CURRENT_RELEASE_SHA`; functional verification; alarm configuration
  verification (no deliberate trigger required).
- **EVIDENCE:** the 34-resource ECS stack applied successfully with
  `release_sha=<CURRENT_RELEASE_SHA>`. The new backend task's ENI and
  public IP were resolved concurrently with the in-flight apply. The Atlas
  allow-list comment first used the full-SHA format and was rejected
  (`HTTP 400`, 91 bytes over the 80-byte limit — see §8's lesson); no entry
  was created by that failed attempt. The corrected, shortened comment
  (`ITAssetPulse #182 sha=3cb1a2a9 phase=release-deploy`, 51 bytes) was
  approved and succeeded (`HTTP 201`), GET-verified present. Both ECS
  services reached steady state. Functional verification passed: frontend
  loaded, login succeeded, backend API responded, MongoDB connectivity
  confirmed, logs present, dashboard rendered, and all three alarms were
  confirmed correctly configured (dimensions, thresholds, evaluation
  periods, SNS action, expected `OK`/`INSUFFICIENT_DATA` state) without
  deliberately triggering one.

### Gate I — Deploy and verify the rollback release
- Scope: same concurrent workflow with `ROLLBACK_SHA`; remove Gate H's
  Atlas entry only after the rollback task is healthy and Gate H's task
  has drained.
- **EVIDENCE:** the ECS stack was reapplied with
  `release_sha=<ROLLBACK_SHA>`. A new task, new ENI, and new public IP
  were resolved independently (never reusing Gate H's IP). The Atlas entry
  for this deploy used the comment `ITAssetPulse #182 sha=48df354e
  phase=rollback-deploy`, created and GET-verified present on the first
  attempt (comment length validated before POST, per the Gate H lesson).
  The rollback task reached steady state and passed the same functional
  checks as Gate H. Only after the rollback task was confirmed healthy and
  Gate H's task was confirmed fully drained (`INACTIVE`/`0/0/0`) was Gate
  H's Atlas entry removed and GET-verified absent — at no point were both
  entries missing or both tasks simultaneously unreachable.

### Gate J — Full teardown
- Scope: `ecs destroy` → remove/verify rollback's Atlas entry → `data
  destroy` → `foundation destroy`, saved-plan pattern for every destroy.
- **EVIDENCE — interrupted destroy and recovery (ECS):** the first
  reviewed `ecs destroy` saved plan contained 34 deletes. The apply was
  run in the foreground under a 5-minute external command timeout; at
  ~4m50s, with the two `aws_ecs_service` deletions still in their normal
  ALB target-group deregistration delay, the external timeout fired and
  interrupted Terraform (an interrupt, not an AWS-side failure).
  Terraform exited having completed 10 of 34 deletes; both ECS services
  were independently confirmed already `DRAINING` with `0/0/0` counts —
  AWS had essentially finished, only Terraform's own bookkeeping was cut
  short. Per the failure procedure: no automatic retry, no state
  manipulation, no manual AWS cleanup; the consumed plan was deleted and
  never reused. A **fresh** recovery plan was created and reviewed,
  correctly refresh-reconciling the two already-gone services out of the
  destroy set (22 remaining deletes, not 24). The recovery apply ran as an
  unattended background process with no external timeout and completed
  naturally (`Apply complete! Resources: 0 added, 0 changed, 22
  destroyed.`). Post-recovery inventory confirmed ECS state fully empty
  (cluster, services, tasks, ALB, target groups, security groups, ENIs,
  JWT secret, execution roles, log groups, alarms, dashboard all absent or
  terminal). See §7's lesson and §13 for the reusable rule this produced.
  - Rollback's Atlas entry (`13.60.192.10/32`) was removed and
    GET-verified absent only after this ECS teardown was confirmed
    complete.
  - `data` was destroyed cleanly on the first attempt (4 deletes: secret,
    secret version, Atlas database user, generated password) — the
    MongoDB secret was confirmed fully absent, including with
    `--include-planned-deletion`, not merely pending-deletion.
  - `foundation` was destroyed cleanly on the first attempt (16 deletes:
    VPC, 4 subnets, IGW, 2 route tables, 4 associations, 2 ECR
    repositories, 2 lifecycle policies), intentionally removing both
    frozen image tags along with the repositories (`force_delete = true`
    — expected, see §13).
  - Final state after Gate J: `ecs`/`data`/`foundation` all empty;
    `bootstrap`/`account` and the Atlas project/cluster untouched.

### Gate K — Final inventory verification
- Scope: residual-classified AWS inventory + bounded polling (§12) + final
  Atlas GET.
- **EVIDENCE — final state summary:** `ecs`, `data`, and `foundation`
  Terraform states all empty, no outputs. `account`: 12 total addresses (7
  managed resources + 5 data sources). `bootstrap`: 6 total addresses (5
  managed resources + 1 data source). Atlas database user: absent (no
  duplicate or renamed replacement). Lifecycle Secrets Manager secrets:
  absent, not pending deletion. Lifecycle Atlas `/32` entries: absent.
  Both ECR repositories: absent (`RepositoryNotFoundException`). Demo
  VPC/networking: absent. Atlas project and cluster: present, unaffected.
  Atlas access list: exactly the three original unrelated entries, no
  broad entry, no duplicate.
  - **Final resource classification:**
    - *Expected persistent:* bootstrap remote-state resources; account
      Budget and SNS alerting resources; GitHub Actions OIDC provider;
      image-publish role and policy; Atlas project and cluster; the three
      unrelated Atlas access-list entries.
    - *Expected historical residue:* backend and frontend task-definition
      revisions 1–3, all `INACTIVE`; historical CloudWatch metric data.
    - *Known unrelated legacy (pre-existing, not created or modified by
      #182):* two `k8s-itassetp-*` orphaned target groups with stale
      references to deleted legacy VPCs; two unrelated historical EKS
      OIDC providers.
    - *Unexpected residual:* none.
  - **Account-stack OIDC tag drift:** the `account` no-drift check
    returned `0 add, 1 change, 0 destroy` — the only drift was on
    `aws_iam_openid_connect_provider.github_actions[0]`'s **tags**
    (identifying an unrelated project). Its URL, client-ID list,
    thumbprint, resource identity, and the ITAssetPulse image-publish
    role's trust restriction (scoped to
    `repo:AldrionDev/ITAssetPulse:ref:refs/heads/main`) all remained
    correct — this account-global, URL-identified singleton resource
    appears to be managed by more than one Terraform project sharing this
    AWS account. No tag remediation was applied within #182. This does
    **not** invalidate the completed deployment/rollback/teardown proof,
    but it does mean the account stack cannot currently be called fully
    no-drift. Ownership is tracked and to be resolved independently in
    **#198** (`infra: define ownership of the shared GitHub Actions OIDC
    provider`).

### Gate L — Finalize runbook and open PR
- Scope: fill in all `EVIDENCE: TBD` placeholders above with real output;
  commit; open PR with `Closes #182` in the body. Does not by itself
  unblock #183.
- **EVIDENCE:** this section filled in and committed as
  `docs: finalize ephemeral demo lifecycle runbook`; PR opened targeting
  `main` with `Closes #182` in the body and a link to follow-up issue
  #198. PR review and merge remain pending — see Gate M.

### Gate M — PR merge and issue closure
- Scope: verify CI, obtain merge approval, merge, verify #182 CLOSED
  (manual close + approval if auto-close didn't fire), record #183 as
  unblocked.
- **EVIDENCE: TBD**

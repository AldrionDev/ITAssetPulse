# Ephemeral Demo Lifecycle Runbook

**Issue:** #182 — End-to-end ephemeral demo verification and runbook
**Depends on:** #181 (closed, merged via PR #197)
**Blocks:** #183 (remains blocked until #182 is confirmed CLOSED — see §16)
**Spec:** `docs/infrastructure-modularization-spec.md` §10.4, §11, §12, §13, §14

> Status: SCAFFOLD. This file is being built gate-by-gate. Sections marked
> `EVIDENCE: TBD` are placeholders filled in as each gate actually executes —
> do not treat unfilled placeholders as results.

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

## 13. PR & issue-closure requirements

- The PR body **must** contain the literal line `Closes #182`.
- Merge only after CI is green and explicit merge approval is given.
- After merge, verify #182 is actually **CLOSED** — if auto-close via
  `Closes #182` did not fire, request separate explicit approval before
  manually closing it.
- Only after #182 is confirmed closed: record #183 as unblocked. Opening
  the PR alone never unblocks #183.

---

## 14. Gate log

Each gate: scope, exact/placeholder commands, expected evidence, abort/
recovery conditions, and an evidence block filled in during execution.

### Gate A — Runbook scaffold
- Scope: create branch, create this file, review diff, commit only after
  explicit approval.
- Classification: local git/filesystem mutation only, no cloud mutation.
- **EVIDENCE: TBD** (this gate's own report is delivered separately, not
  written into this file, since the file itself is the artifact being
  reviewed pre-commit).

### Gate B — `account` drift reconciliation + persistent-layer verification
- Scope: saved-plan reconcile the missing GitHub OIDC provider on
  `account`; then fresh `account` plan must show no changes; read-only
  `bootstrap` plan must show no changes; verify state bucket, Budget, SNS
  topic/subscription, OIDC provider, image-publish role.
- **EVIDENCE: TBD**

### Gate C — Atlas pre-deployment reconciliation
- Scope: resolve the `0.0.0.0/0` entry (delete unless a legitimate
  dependency is found) and the stale `13.60.201.215/32` (issue #180
  residue) with an explicit keep/delete decision — before any ECS
  deployment.
- **EVIDENCE: TBD**

### Gate D — Baseline cleanup: destroy `data`, then `foundation`
- Scope: mandatory precondition check (`recovery_window_in_days = 0` on
  the Secrets Manager resource) before proposing the destroy plan; then
  saved-plan destroy of `data`, then `foundation`.
- **EVIDENCE: TBD**

### Gate E — Fresh apply: `foundation`, then `data`
- **EVIDENCE: TBD**

### Gate F — Release-freeze checkpoint
- **EVIDENCE: TBD** (records the two frozen 40-char SHAs)

### Gate G — Publish both frozen SHAs and verify
- Scope: dispatch `publish-images.yml` for `CURRENT_RELEASE_SHA` and
  `ROLLBACK_SHA`; verify both tags exist in both ECR repos.
- **EVIDENCE: TBD**

### Gate H — Deploy and verify the current release
- Scope: concurrent apply + Atlas allow-list workflow (§9) with
  `CURRENT_RELEASE_SHA`; functional verification; alarm configuration
  verification (no deliberate trigger required).
- **EVIDENCE: TBD**

### Gate I — Deploy and verify the rollback release
- Scope: same concurrent workflow with `ROLLBACK_SHA`; remove Gate H's
  Atlas entry only after the rollback task is healthy and Gate H's task
  has drained.
- **EVIDENCE: TBD**

### Gate J — Full teardown
- Scope: `ecs destroy` → remove/verify rollback's Atlas entry → `data
  destroy` → `foundation destroy`, saved-plan pattern for every destroy.
- **EVIDENCE: TBD**

### Gate K — Final inventory verification
- Scope: residual-classified AWS inventory + bounded polling (§12) + final
  Atlas GET.
- **EVIDENCE: TBD**

### Gate L — Finalize runbook and open PR
- Scope: fill in all `EVIDENCE: TBD` placeholders above with real output;
  commit; open PR with `Closes #182` in the body. Does not by itself
  unblock #183.
- **EVIDENCE: TBD**

### Gate M — PR merge and issue closure
- Scope: verify CI, obtain merge approval, merge, verify #182 CLOSED
  (manual close + approval if auto-close didn't fire), record #183 as
  unblocked.
- **EVIDENCE: TBD**

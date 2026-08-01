# HCP Terraform Workspace Preparation Runbook

**Issue:** #202 — infra: prepare HCP Terraform project and workspaces
**Depends on:** #201 (closed) — `docs/infrastructure-hcp-jenkins-spec.md`
**Blocks:** #203 — Terraform state migration to HCP Terraform
**Spec:** `docs/infrastructure-hcp-jenkins-spec.md` §6–§10

> Status: EXECUTED. The HCP Terraform project and all four workspaces
> described below have been created and verified empty. **No Terraform
> state has been migrated, uploaded or generated anywhere in this issue.**
> The real `terraform_remote_state` output-read proof against these
> workspaces is deferred to #203.

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
which grants access to explicitly named workspaces. This is preference #1
of the three options in spec §10 (specific workspaces → project-wide →
organization-wide) — it worked on the first attempt on the `free_standard`
plan, so **no broader (project-wide or organization-wide) sharing was
ever enabled**, and no fallback was necessary.

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
locally stored credential; none of them prints the token itself.

```bash
# Organization reachable with this token (name only)
curl -s --header "Authorization: Bearer $(jq -r '.credentials["app.terraform.io"].token' ~/.terraform.d/credentials.tfrc.json)" \
  --header "Accept: application/vnd.api+json" \
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

## 9. Explicit non-goals of this issue

- **No Terraform state was migrated, uploaded or generated.** All four
  workspaces remain empty on completion of this issue.
- No `.tf` file was modified. `infra/terraform/ecs/remote_state.tf` still
  reads `foundation`/`data`/`account` state via the S3 backend — switching
  it to `backend = "remote"` is #203's job.
- No AWS resource was created, changed or read.
- No Jenkins configuration or credential was created.
- No GitHub Actions workflow, secret, or variable was touched.

**Next step:** #203 migrates the `account` state (the only non-empty
state) onto `itassetpulse-account`, and cleanly re-initializes
`foundation`, `data` and `ecs` onto their respective empty workspaces —
proving the remote-state-consumer configuration recorded in §5 by having
`itassetpulse-ecs` actually read the other three workspaces' outputs.

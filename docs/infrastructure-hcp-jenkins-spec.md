# ITAssetPulse — HCP Terraform and Local Jenkins Architecture Specification (v1)

Status legend used throughout this document:

- **CURRENT** — implemented and true today.
- **PLANNED** — decided as the target model for the `Local Jenkins & HCP Terraform Migration v1` milestone,
  not yet implemented.
- **DEFERRED** — explicitly out of this milestone, planned for a later one.
- **OUT OF SCOPE** — consciously excluded, not planned at all.

This document is the design of record for milestone #25 (`Local Jenkins & HCP Terraform Migration v1`). It
does not implement anything by itself; every referenced change belongs to the issue named next to it.

---

## 1. Purpose and decision summary

**Status: CURRENT (context) / PLANNED (decision)**

ITAssetPulse currently stores Terraform state in an AWS S3 bucket owned by the project's own `bootstrap`
stack, and authenticates its only AWS-facing GitHub Actions workflow through a **shared, account-global**
GitHub OIDC provider (`token.actions.githubusercontent.com`). That provider is not owned exclusively by this
project — other projects in the same shared AWS account can create, delete or recreate it, which makes image
publishing an unstable dependency (see [`docs/ci-cd.md`](./ci-cd.md)).

The decision recorded here is to:

- move Terraform state storage and history to **HCP Terraform**, in **Local execution mode** (HCP Terraform
  never executes Terraform itself — it is a state backend, not a CI/CD platform);
- run Terraform locally or from a **local, Docker-based Jenkins** instance instead of GitHub Actions;
- stop depending on the shared GitHub Actions OIDC provider entirely, so ITAssetPulse no longer competes for
  ownership of an account-global resource;
- authenticate Jenkins to AWS through **project-specific IAM roles**, never a broad or shared identity;
- gate every Terraform apply behind a **manually approved, reviewed saved plan** — no automatic or unattended
  apply, ever.

This is a state-backend and identity-model change. It does not change the ECS Fargate + ALB target
architecture, which remains specified in
[`docs/infrastructure-modularization-spec.md`](./infrastructure-modularization-spec.md).

---

## 2. Current architecture and limitations

**Status: CURRENT**

- Terraform remote state for `account`, `foundation`, `data` and `ecs` lives in HCP Terraform (migrated by
  #203; `cloud {}` in each root's `backend.tf`). The former AWS S3 bucket created and owned by the
  `bootstrap` stack is a retained historical recovery copy only, no longer read or written.
- `bootstrap` itself uses local state and remains the sole owner of the (now unused) state bucket and its
  locking mechanism until #209 retires it.
- GitHub Actions CI (`ci.yml`) is AWS-credential-free: it runs lint, test, build and `terraform fmt -check` /
  `terraform init -backend=false` / `terraform validate` only, with the backend disabled in every job.
- `publish-images.yml` is the only workflow that authenticates to AWS. It is explicitly **transitional**: it
  assumes an IAM role via the shared, account-global GitHub OIDC provider. That provider's actual existence
  and ownership can change outside this repository at any time.
- ECS Fargate + ALB is the **implemented Terraform target architecture** — the code exists — but the
  `foundation`, `data` and `ecs` demo resources are **currently not provisioned** in AWS.
- The HCP Terraform project and four Local execution workspaces were created under #202. Terraform state migration onto them (#203) is complete: HCP Terraform is now the active backend for `account`, `foundation`, `data` and `ecs`.
- The reusable local Jenkins controller is implemented in the separate `AldrionDev/local-jenkins-platform` repository. ITAssetPulse-specific integration documentation is implemented under #204.
- No ITAssetPulse Jenkins pipeline has been implemented yet; image publishing remains #206 and manually approved Terraform execution remains #208.

### Known limitation this milestone addresses

The shared-account OIDC provider is an external dependency this project does not control. A previous attempt
at establishing exclusive ownership of that provider (issue #198) was closed as superseded: single ownership
of an account-global resource is unreachable from one project in a shared account. This milestone's approach
is to stop depending on that resource rather than to keep contesting it.

---

## 3. Shared AWS-account constraints

**Status: CURRENT (constraint) / PLANNED (response)**

The AWS account ITAssetPulse deploys into is shared with other, unrelated projects. This has concrete
consequences for the target design:

- Account-global singleton resources (the GitHub OIDC provider being the clearest example) can be created,
  deleted or recreated by any project in the account at any time. ITAssetPulse must depend on **zero** such
  resources after this milestone (see §7 and #207).
- IAM roles, policies and Terraform-managed resources must be scoped narrowly and named for this project only
  (`itassetpulse-*`), never assumed to have exclusive control of anything account-wide.
- Any read-only discovery of existing account state (for example, checking whether an OIDC provider currently
  exists) must not assume the result is stable between the check and a later apply.

---

## 4. Target responsibility model

**Status: PLANNED**

| System                     | Stores / does                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub                     | Source code, Terraform configuration, Dockerfiles, Jenkins pipeline definitions, documentation. No AWS credential, no HCP token.                                                       |
| HCP Terraform              | Terraform state and state history for every remote-state root. Local execution mode only — it never runs `plan` or `apply` itself.                                                     |
| Local Docker-based Jenkins | Release builds (image publishing to ECR) and, later, manually approved Terraform saved-plan execution. Holds the only long-lived AWS-facing credential, in its local credential store. |
| AWS                        | Runtime resources only (network, ECR, ECS, ALB, Secrets Manager, the project-specific IAM roles Jenkins assumes). Reproducible entirely from GitHub + HCP Terraform + Jenkins.         |

---

## 5. GitHub responsibilities

**Status: PLANNED (end state) — see §13 for the current state**

- Hosts source code, all Terraform configuration, Dockerfiles, Jenkins pipeline definitions (`ci/jenkins/`)
  and documentation.
- Runs GitHub Actions **only** as an AWS-credential-free CI quality gate: backend/frontend lint, test, build,
  plus `terraform fmt -check`, `terraform init -backend=false` and `terraform validate` for every root stack.
- Holds **zero** AWS-related secrets or variables once #207 completes.
- Does not authenticate to AWS in any workflow, and does not authenticate to HCP Terraform.

---

## 6. HCP Terraform responsibilities

**Status: CURRENT**

- Stores the Terraform state and full state history for every active remote-state root (`account`,
  `foundation`, `data`, `ecs`) — #203 migrated them off the AWS S3 backend.
- Does **not** execute Terraform runs. Every workspace uses Local execution mode (§7).
- Provides the authentication surface (`terraform login` / `TF_TOKEN_app_terraform_io`) used locally and,
  once #208 lands, from Jenkins.
- Enforces state-sharing between workspaces on a least-privilege basis (§10).

---

## 7. Local execution mode

**Status: CURRENT (workspace mode, state migration) / PLANNED (Jenkins execution)**

Every HCP Terraform workspace ITAssetPulse uses runs in **Local execution mode**, not Remote or Agent
execution:

- `terraform plan` and `terraform apply` always run on a machine ITAssetPulse controls — the developer's own
  PC or the local Jenkins container — never inside HCP Terraform's own run environment.
- HCP Terraform's role is limited to holding the resulting state and its history after each run pushes it.
- This keeps the AWS-facing credentials entirely off HCP Terraform's infrastructure: no AWS credential is ever
  configured inside an HCP Terraform workspace.

---

## 8. HCP project and workspace mapping

**Status: CURRENT**

| HCP object   | Value                         |
| ------------ | ----------------------------- |
| Organization | `gabor-toth-personalprojects` |
| Project      | `ITAssetPulse`                |
| Workspace    | `itassetpulse-account`        |
| Workspace    | `itassetpulse-foundation`     |
| Workspace    | `itassetpulse-data`           |
| Workspace    | `itassetpulse-ecs`            |

All four workspaces are **CLI-driven** (not VCS-driven) and run in **Local execution mode**. No `bootstrap`
workspace is created — the `bootstrap` stack is not migrated (§9).

---

## 9. Terraform root and state ownership

**Status: CURRENT**

| Root         | Former state              | Current state              | Notes                                                                                                         |
| ------------ | -------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `bootstrap`  | Local state, 5 resources   | **Not migrated**           | Retired by #209 once HCP Terraform is proven; its only responsibility (the S3 state bucket) becomes obsolete. |
| `account`    | S3, **7** managed resources | `itassetpulse-account`     | Migrated in #203. The only root with a real state migration; all seven managed resources preserved unchanged. A pre-existing AWS drift on the OIDC provider resource was found and deferred to #207. |
| `foundation` | S3, empty (0 resources)    | `itassetpulse-foundation`  | Cleanly re-initialized in #203; no state snapshot exists yet — nothing was there to move.                     |
| `data`       | S3, empty (0 resources)    | `itassetpulse-data`        | Cleanly re-initialized in #203; no state snapshot exists yet — nothing was there to move.                     |
| `ecs`        | S3, empty (0 resources)    | `itassetpulse-ecs`         | Cleanly re-initialized in #203; no state snapshot exists yet — nothing was there to move.                     |

> **Historical correction.** This table previously read "6 managed resources" for `account`. That figure was
> an unverified planning assumption inherited from #201. #203's Gate 4 preflight read the real state and
> found **seven** — the extra address is `aws_iam_openid_connect_provider.github_actions[0]`, a legitimate
> managed member of the state that #203 preserved unchanged. Its removal belongs to #207, not #203.

`ecs` reads outputs from `account` (SNS topic ARN, observability increment), `foundation` (VPC/ECR outputs)
and `data` (Secrets Manager secret ARN) via `terraform_remote_state`, matching the dependency graph in
[`infrastructure-modularization-spec.md` §6](./infrastructure-modularization-spec.md#6-state-keys-and-dependency-graph).
Since #203 this is a `backend = "remote"` read against the corresponding HCP workspace instead of an S3 key.

---

## 10. State sharing and least-privilege rules

**Status: CURRENT**

Least-privilege state sharing was configured under #202:

- `itassetpulse-account` shares state only with `itassetpulse-ecs`;
- `itassetpulse-foundation` shares state only with `itassetpulse-ecs`;
- `itassetpulse-data` shares state only with `itassetpulse-ecs`;
- `itassetpulse-ecs` shares its state with no workspace.

No workspace uses project-wide or organization-wide state sharing.

This gives the `ecs` root access only to the upstream outputs it requires while preventing reverse or
unrelated workspace access.

---

## 11. Local Docker-based Jenkins model

**Status: CURRENT (controller platform) / PLANNED (project pipelines)**

The reusable Jenkins controller is maintained outside this repository in:

```text
AldrionDev/local-jenkins-platform
```

The external platform repository owns:

- the Docker Compose-based Jenkins controller;
- the custom Jenkins image and pinned plugin versions;
- Jenkins Configuration as Code;
- persistent `JENKINS_HOME`;
- localhost-only access on `127.0.0.1:8080`;
- Docker CLI, Docker Compose and Docker Buildx integration;
- startup, shutdown, status, backup and restore procedures;
- controller-level security documentation.

The controller has no published inbound agent port and requires no public URL, webhook, SCM polling or scheduled trigger.

ITAssetPulse does not contain a second Jenkins controller. Its `ci/jenkins/` directory contains only project-specific integration documentation and, under their owning follow-up issues, project-specific pipeline definitions.

The responsibility boundary is:

- `local-jenkins-platform` owns the reusable controller;
- ITAssetPulse owns its job names, credential IDs, AWS role references and Jenkinsfiles;
- #206 owns the ECR image-publishing pipeline;
- #208 owns the manually approved Terraform pipeline.

Building container images uses the host Docker daemon through `/var/run/docker.sock`. This grants Jenkins jobs effectively host-root-equivalent access and is an explicitly accepted trade-off for a trusted, single-user, localhost-only development environment. The detailed risk and operational protections are documented in the external platform repository.

The controller is designed to support another trusted personal project later without copying or duplicating the Jenkins platform configuration.

---

## 12. Daily PC startup and shutdown behavior

**Status: CURRENT (configuration and manual operation) / PLANNED (host-restart verification)**

Powering the developer's PC down and up daily is an explicitly **accepted, supported** operating model, not a
limitation to work around:

- Persistent `JENKINS_HOME` preserves Jenkins configuration, credentials and build history across container
  recreation and host restarts.
- If Jenkins was running before the PC shut down and Docker starts after boot, `restart: unless-stopped`
  restarts the controller automatically.
- If Jenkins was explicitly stopped with `./scripts/stop.sh`, it remains stopped and must be started manually
  with `./scripts/start.sh`.
- Shutting down the PC does not stop, modify or otherwise affect running AWS resources, HCP Terraform state,
  Git repositories or already-published ECR images.
- No scheduled job, webhook or external poller depends on Jenkins being continuously available.

---

## 13. GitHub Actions CI boundary

**Status: CURRENT (ci.yml) / PLANNED (end state after #207)**

`ci.yml` today already matches the target boundary: it runs backend/frontend quality gates and AWS-free
Terraform format/init/validate checks, and configures no AWS credential. The only change still pending is on
`publish-images.yml` (§14) — once #207 removes it and the associated OIDC dependency, GitHub Actions will hold
no AWS-authenticating workflow of any kind, matching the target boundary exactly. See
[`docs/ci-cd.md`](./ci-cd.md) for the authoritative current-state description.

---

## 14. Jenkins release boundary

**Status: PLANNED**

- Jenkins becomes the sole owner of container image publishing to Amazon ECR, replacing
  `.github/workflows/publish-images.yml` (#206). The Jenkins pipeline is built and proven functional **before**
  the GitHub Actions OIDC path is dismantled (#207), so a working publishing path exists at every point.
- Jenkins later becomes the sole owner of Terraform plan/apply execution for `foundation`, `data` and `ecs`
  (and, when needed, `account`), through a manually approved saved-plan pipeline (#208).
- Neither pipeline runs on a schedule or a webhook; both are manually triggered.
- Tags published by the Jenkins image-publishing pipeline are immutable full 40-character commit SHAs only —
  no `latest` tag is created or moved, matching the current `publish-images.yml` behavior.

---

## 15. AWS authentication model

**Status: PLANNED**

```
Jenkins source principal
        |  sts:AssumeRole
        v
project-specific Jenkins roles
```

**Preferred — dedicated minimal Jenkins source principal.** A dedicated IAM principal whose only permission is
`sts:AssumeRole` on the approved project-specific roles below. It receives **no** direct infrastructure
permission of any kind (no ECR, ECS, VPC, ELB, Secrets Manager or IAM permission). Its credentials live only
in the Jenkins credential store and are never entered into Terraform, so they never reach Terraform state.

**Fallback — the existing operator principal.** Permitted only if the shared-account administrator cannot
provide a dedicated Jenkins principal. If used, the reason and the resulting risk (Jenkins running under an
identity with broader standing permissions than the roles it assumes) must be recorded where the decision is
made (#205).

Both options exclude Jenkins from ever holding a direct infrastructure permission — every actual permission
lives on the assumed project-specific roles, and assumed-role sessions are short-lived (`MaxSessionDuration`
of one hour).

The exact source-principal decision and its IAM configuration are made in #205, not here.

---

## 16. Project-specific Jenkins IAM roles

**Status: PLANNED**

Two separate roles, never one unrestricted Jenkins administrator role:

- **Jenkins image-publishing role** (`itassetpulse-jenkins-image-publish`) — ECR push on `itassetpulse-*`
  repositories plus `ecr:GetAuthorizationToken`. Nothing else. Matches the permission set the retired OIDC
  publish role had.
- **Jenkins Terraform role** (`itassetpulse-jenkins-terraform`) — the permissions Terraform needs to manage
  the `foundation`, `data` and `ecs` stacks.

The two roles stay separate so the image-publishing pipeline can never touch infrastructure and the Terraform
pipeline can never push images. Exact IAM policy documents are defined and implemented in #205, not in this
specification.

---

## 17. Terraform saved-plan and approval model

**Status: PLANNED**

Every Terraform apply — whether run locally or from Jenkins — follows the same rule: **apply only a reviewed,
exact saved plan, gated by an explicit human approval.**

- `terraform plan -out=<stack>.tfplan`, with a readable resource-address summary and a computed SHA-256 of the
  saved plan.
- A named approval step (a Jenkins `input` step, once #208 lands) presents the summary and the plan hash to an
  authorized approver before any apply.
- `terraform apply` runs against **exactly** the reviewed saved plan after re-verifying its SHA-256 — no
  re-plan, no `-auto-approve`, no plan regeneration.
- No automatic or unattended apply under any condition, including after a Jenkins restart or a host power
  cycle: an interrupted approval window requires a fresh explicit approval, never a resumed one.
- No `terraform destroy` pipeline exists in this milestone; teardown stays a locally executed, documented
  saved-plan operation, matching today's model.

---

## 18. State, token and credential handling

**Status: PLANNED**

- No AWS credential of any kind is stored in GitHub (repository, organization, or Actions secrets/variables)
  once #207 completes.
- No HCP Terraform token is stored in GitHub.
- No credential value appears in any Jenkinsfile, the external platform's `casc/jenkins.yaml`, or any other repository file — only credential IDs referencing entries in the local Jenkins credential store.
- No Terraform state is committed to Git at any point; state lives exclusively in HCP Terraform.
- The HCP Terraform token used locally lives only in `~/.terraform.d/credentials.tfrc.json`; the token used by
  Jenkins lives only in the Jenkins credential store.
- Assumed-role AWS sessions are temporary (one-hour maximum), never long-lived.

---

## 19. Full rebuild flow

**Status: PLANNED (end-to-end) — see #200**

Once the prerequisites below are in place, the full ITAssetPulse demo environment is rebuilt end to end on the
new model, exercising the new state backend, identity model and execution path together:

```
account apply (HCP-backed, Local execution mode)
  -> foundation apply
  -> data apply
  -> image publication (Jenkins release job)
  -> ecs apply
  -> temporary MongoDB Atlas access-list entry (manual runbook)
  -> functional verification
```

Every Terraform mutation in this flow runs through the manually approved saved-plan pipeline (§17). This
end-to-end run is the subject of #200, not of this document.

---

## 20. Disaster-recovery boundaries

**Status: DEFERRED — full runbook is #210**

What is retained if the entire ITAssetPulse AWS footprint is cleared: the GitHub repository, the HCP Terraform
state and state history, the Jenkins configuration and credential store, and the MongoDB Atlas project. What
is lost: every ITAssetPulse AWS resource, rebuildable from the retained systems.

The bootstrapping order has one hard dependency: the `account` stack creates the Jenkins IAM roles, so the
very first `account` apply after a full AWS clear must run with the operator's own credentials — Jenkins is
not a prerequisite for its own roles. The local saved-plan path is the documented fallback for exactly this
case.

The complete, evidenced recovery procedure — including Jenkins host recovery, HCP Terraform re-authentication,
and the full AWS-clear rebuild sequence — is written and evidenced in #210, not here.

---

## 21. Security trade-offs

**Status: CURRENT (controller protections) / PLANNED (AWS identity model)**

- **Long-lived local source credential vs. short-lived OIDC tokens.** Moving away from GitHub Actions OIDC trades short-lived, keyless tokens for a Jenkins source principal with longer-lived credentials, held only in the local Jenkins credential store. This is accepted because the alternative — continuing to depend on a shared, account-global OIDC provider this project does not own — has already proven unstable in practice. The source principal and project-specific IAM roles remain owned by #205.

- **Docker socket access.** Mounting `/var/run/docker.sock` into the Jenkins controller grants Jenkins jobs effectively host-root-equivalent access to the local machine. This is an accepted trade-off for a trusted, single-user, localhost-only Jenkins platform. The controller remains non-root, receives Docker access through the host socket group ID, disables anonymous access and accepts only trusted repositories and Jenkinsfiles. The detailed risk and operational protections are documented in the external `AldrionDev/local-jenkins-platform` repository.

- **Localhost-only exposure.** Jenkins is reachable only through `127.0.0.1:8080`. It has no public URL, webhook, SCM polling, scheduled trigger or published inbound agent port. This removes external network exposure at the cost of requiring the developer's workstation to be running while jobs are executed.

- **Assumed-role sessions remain short-lived.** Once #205 implements the Jenkins AWS identity model, assumed-role sessions remain limited to one hour regardless of how long the local source credential exists, bounding the blast radius of a compromised session.

---

## 22. Migration sequence

**Status: PLANNED**

1. Architecture specification (this document) — #201.
2. HCP Terraform project and workspace preparation, zero state risk — #202.
3. Terraform state migration to HCP Terraform — #203.
4. Local Docker-based Jenkins platform, no AWS integration yet — #204.
5. Project-specific Jenkins AWS roles — #205.
6. Jenkins ECR image-publishing pipeline, proven functional before OIDC removal — #206.
7. GitHub Actions OIDC dependency removal — #207.
8. Jenkins manually approved Terraform pipeline — #208.
9. Full demo rebuild on the new model — #200.
10. Legacy S3 backend and `bootstrap` stack retirement — #209.
11. Disaster-recovery runbook, evidenced by #200 — #210.

Each step's implementation belongs strictly to its own issue; this document records the sequence and the
target end state, not the step-by-step execution.

---

## 23. Explicit non-goals

**Status: OUT OF SCOPE**

- A public Jenkins URL, GitHub webhooks, scheduled builds, or any inbound network exposure for Jenkins.
- Kubernetes or dynamic cloud-based Jenkins agents.
- A Jenkins shared library or generic multi-project pipeline framework. The external controller may support other trusted projects, while each project keeps its own pipeline definitions and credentials.
- Automatic or unattended `terraform apply` under any condition.
- Any `terraform destroy` pipeline in Jenkins.
- Application feature changes or a redesign of the ECS Fargate + ALB target architecture beyond the state
  backend and identity model.
- Reintroducing EKS.
- The legacy EKS path and workflow cleanup, which remained owned by #183 and is already complete.

---

## 24. Related issues and ownership

**Status: reference table**

| Area                                            | Issue |
| ----------------------------------------------- | ----- |
| Architecture specification (this document)      | #201  |
| HCP Terraform project and workspace preparation | #202  |
| Terraform state migration                       | #203  |
| Local Docker-based Jenkins platform             | #204  |
| Project-specific Jenkins AWS IAM roles          | #205  |
| Jenkins ECR image-publishing pipeline           | #206  |
| GitHub Actions OIDC dependency removal          | #207  |
| Jenkins manually approved Terraform pipeline    | #208  |
| Full demo environment rebuild                   | #200  |
| Legacy S3 backend and `bootstrap` retirement    | #209  |
| Disaster-recovery runbook                       | #210  |

The table records implementation ownership. Completed and current capabilities are summarized in §25, while
unfinished work remains owned by the referenced follow-up issues.

---

## 25. Current implementation status

**Status: CURRENT**

At the completion of issue #203:

- Terraform state for `account`, `foundation`, `data` and `ecs` is now in HCP Terraform. #203 migrated the
  `account` state (seven managed resources, preserved unchanged) and cleanly initialized the three empty
  roots. The former AWS S3 backend owned by `bootstrap` is a retained historical recovery copy only, not
  read or written after migration; its retirement together with `bootstrap` remains owned by #209. A
  pre-existing AWS drift on the `account` OIDC provider was found during migration and deferred to #207.
- The HCP Terraform project and four CLI-driven Local execution workspaces were created and verified under #202:
  - `itassetpulse-account`;
  - `itassetpulse-foundation`;
  - `itassetpulse-data`;
  - `itassetpulse-ecs`.

- Least-privilege state sharing is configured from `itassetpulse-account`, `itassetpulse-foundation` and `itassetpulse-data` to `itassetpulse-ecs`. The `itassetpulse-ecs` workspace shares its state with no workspace.
- GitHub Actions CI (`ci.yml`) remains AWS-credential-free.
- `publish-images.yml` remains transitional and continues to depend on the shared GitHub OIDC provider until #206 proves the Jenkins publishing path and #207 removes the superseded workflow and OIDC dependency.
- The reusable local Jenkins controller is implemented in the separate `AldrionDev/local-jenkins-platform` repository.
- The external Jenkins platform provides:
  - a reproducible Docker Compose controller;
  - pinned Jenkins and Docker tool versions;
  - pinned and security-checked plugins;
  - Jenkins Configuration as Code;
  - persistent `JENKINS_HOME`;
  - localhost-only access;
  - no published inbound agent port;
  - trusted local Docker build access;
  - startup, shutdown and status tooling;
  - tested backup and bootable restore procedures.

- `ci/jenkins/README.md` documents the ITAssetPulse-specific responsibility boundary, job naming, credential IDs, source checkout model and future pipeline ownership.
- No ITAssetPulse Jenkinsfile, ECR publishing pipeline or Terraform execution pipeline exists yet. Those implementations remain owned by #206 and #208.
- No AWS resource, Terraform state, HCP Terraform resource, GitHub Actions secret or credential value is changed by #204.
- ECS Fargate + ALB remains the implemented Terraform target architecture. The `foundation`, `data` and `ecs` demo resources are not currently provisioned.
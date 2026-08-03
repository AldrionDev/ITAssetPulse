# ITAssetPulse Jenkins Integration

ITAssetPulse uses a reusable, project-independent Jenkins controller maintained in a separate repository:

```text
AldrionDev/local-jenkins-platform
```

The external repository owns the Jenkins controller platform. This directory owns only the ITAssetPulse-specific integration, job conventions and future pipeline definitions.

## Responsibility boundary

### Jenkins platform repository

The `local-jenkins-platform` repository owns:

- the Docker Compose-based Jenkins controller;
- the custom Jenkins image;
- pinned Jenkins plugins and tool versions;
- Jenkins Configuration as Code;
- persistent `JENKINS_HOME`;
- localhost-only controller access;
- Docker CLI, Docker Compose and Docker Buildx access;
- startup, shutdown, status, backup and restore procedures;
- controller-level security documentation.

The platform repository must remain project-independent. It must not contain:

- ITAssetPulse AWS account details;
- ITAssetPulse ECR repository names;
- ITAssetPulse Terraform root logic;
- ITAssetPulse IAM role ARNs;
- ITAssetPulse pipeline business logic;
- ITAssetPulse credential values.

### ITAssetPulse repository

This repository owns:

- ITAssetPulse-specific Jenkins jobs;
- ITAssetPulse Jenkins pipeline definitions;
- project-specific Jenkins credential IDs;
- project-specific AWS role references;
- ECR image-publishing logic;
- manually approved Terraform plan and apply logic.

This repository does not contain:

- a second Jenkins controller;
- Jenkins controller Docker Compose configuration;
- a Jenkins controller Dockerfile;
- controller-level JCasC configuration;
- duplicated plugin-management configuration.

## Operating model

The supported v1 workflow is:

1. Start Docker on the local workstation.
2. Start the external Jenkins platform.
3. Open Jenkins at `http://127.0.0.1:8080`.
4. Manually run the required ITAssetPulse job.
5. Review the job result.
6. Stop Jenkins when it is no longer needed.

ITAssetPulse Jenkins jobs are manually triggered in v1.

The integration does not use:

- GitHub webhooks;
- SCM polling;
- scheduled triggers;
- public Jenkins ingress;
- Kubernetes Jenkins agents;
- remote Jenkins agents;
- dynamic cloud agents.

Stopping Jenkins or shutting down the workstation does not modify:

- running AWS infrastructure;
- Terraform state stored in HCP Terraform;
- Git repositories;
- previously published ECR images.

## Source checkout

ITAssetPulse jobs obtain source code from:

```text
https://github.com/AldrionDev/ITAssetPulse.git
```

Jobs should use Pipeline from SCM or an explicit Git checkout.

The selected Git commit must remain identifiable throughout the build. Image-publishing jobs use the immutable full 40-character Git commit SHA as the image tag.

When authenticated access is required, source checkout references this Jenkins credential ID:

```text
itassetpulse-github-read
```

The credential value exists only in the local Jenkins credential store.

No GitHub token, password, SSH private key or generated credential value may be committed to this repository.

## Job naming

All ITAssetPulse Jenkins jobs use the lowercase prefix:

```text
itassetpulse-
```

Reserved job names and patterns:

```text
itassetpulse-publish-images
itassetpulse-terraform-<root>
```

Supported Terraform roots:

```text
account
foundation
data
ecs
```

Examples:

```text
itassetpulse-terraform-account
itassetpulse-terraform-foundation
itassetpulse-terraform-data
itassetpulse-terraform-ecs
```

The prefix prevents collisions with jobs belonging to other projects using the same Jenkins controller.

## Credential IDs

The following stable Jenkins credential IDs are reserved:

| Credential ID                      | Purpose                                                                                   | Implementation owner        |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| `itassetpulse-github-read`         | Read access to the private ITAssetPulse GitHub repository when authentication is required | Local Jenkins configuration |
| `itassetpulse-aws-source`          | AWS source identity used to assume project-specific Jenkins roles                         | Issue #205                  |
| `itassetpulse-hcp-terraform-token` | HCP Terraform token used for Local execution mode state access                            | Issue #208                  |

These are identifiers only. No credential value is defined by this document.

Credential values must exist exclusively in the local Jenkins credential store or another explicitly approved local secret mechanism.

Credential values must never appear in:

- this repository;
- Jenkinsfiles;
- JCasC files;
- `.env.example`;
- Terraform variables;
- Terraform state;
- GitHub Actions configuration introduced for Jenkins.

ITAssetPulse credentials must remain separated from credentials belonging to other projects.

## Pipeline ownership

Future project-specific pipeline files use these reserved locations:

```text
ci/jenkins/pipelines/publish-images.Jenkinsfile
ci/jenkins/pipelines/terraform.Jenkinsfile
```

Ownership:

| Pipeline file                                     | Owning issue                                 |
| ------------------------------------------------- | -------------------------------------------- |
| `ci/jenkins/pipelines/publish-images.Jenkinsfile` | #206 — Jenkins ECR image-publishing pipeline |
| `ci/jenkins/pipelines/terraform.Jenkinsfile`      | #208 — manually approved Terraform pipelines |

Issue #204 does not create placeholder Jenkinsfiles and does not implement:

- ECR authentication;
- Docker image publishing;
- Terraform initialization;
- Terraform planning;
- Terraform approval;
- Terraform apply.

Those changes remain owned by their dedicated follow-up issues.

## Docker security boundary

The external Jenkins platform has access to the local Docker daemon.

Docker daemon access gives Jenkins jobs extensive control over the host and is effectively a high-privilege capability. This is an accepted trade-off for the trusted, single-user local homelab environment.

The platform protections include:

- Jenkins UI bound only to `127.0.0.1:8080`;
- no public ingress;
- no published inbound agent port;
- anonymous Jenkins access disabled;
- only trusted repositories and trusted Jenkinsfiles may run;
- untrusted pull requests must not execute automatically.

Detailed controller and Docker socket security documentation is maintained in the `local-jenkins-platform` repository.

## Infrastructure safety

This integration documentation creates no infrastructure mutation.

Issue #204 introduces:

- no Terraform state change;
- no AWS resource change;
- no HCP Terraform resource change;
- no GitHub Actions secret or variable change;
- no ECR publishing;
- no Terraform execution;
- no credential value.
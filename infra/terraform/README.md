# ITAssetPulse Terraform Infrastructure

This folder contains the Terraform configuration for the ITAssetPulse AWS infrastructure.

ITAssetPulse is a CV/demo project, so this Terraform setup is intentionally simple and focused on a single demo environment.

## Current scope

This milestone prepares the Terraform foundation only.

It does not create application infrastructure yet.

Not included yet:

- VPC
- EC2
- ECR
- EKS
- Application deployment
- Monitoring resources
- Remote state backend

## Folder structure

```text
infra/
  terraform/
    main.tf
    variables.tf
    outputs.tf
    providers.tf
    versions.tf
    terraform.tfvars.example
```

**Files**

- versions.tf defines the required Terraform and AWS provider versions.
- providers.tf configures the AWS provider and default tags.
- variables.tf defines reusable input variables.
- outputs.tf shows basic Terraform output values.
- main.tf will contain AWS resources in later milestones.
- terraform.tfvars.example shows example local variable values.

## Local setup

Copy the example variables file:

```bash
cp terraform.tfvars.example terraform.tfvars
```

The real terraform.tfvars file is local only and must not be committed.

## Terraform commands

Format Terraform files:

```bash
terraform fmt
```

Initialize Terraform:

```bash
terraform init
```

Validate the configuration:

```bash
terraform validate
```

Preview changes:

```bash
terraform plan
```

Apply changes:

```bash
terraform apply
```

terraform apply

For this issue, terraform apply is not required because no real AWS infrastructure is created yet.

## Remote state backend

Terraform state is stored remotely in an S3 bucket.

The remote state bucket is created once with the bootstrap Terraform configuration:

```text
infra/terraform/bootstrap
```

The main Terraform configuration uses this S3 bucket as its backend.

Current backend configuration:

```hcl
bucket       = "itassetpulse-demo-terraform-state-554422868760"
key          = "itassetpulse/demo/terraform.tfstate"
region       = "eu-north-1"
encrypt      = true
use_lockfile = true
```

The real backend.hcl file is local only and must not be committed.

Create it from the example:

```bash
cp backend.hcl.example backend.hcl
```

Initialize the main Terraform configuration with the remote backend:

```bash
terraform init -backend-config=backend.hcl
```

Bootstrap workflow

Run the bootstrap Terraform configuration first:

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars
terraform fmt
terraform init
terraform validate
terraform plan
terraform apply
```

This creates:

- S3 bucket for Terraform remote state
- Bucket versioning
- Server-side encryption
- Public access block

Verify remote state:

```bash
aws s3 ls s3://itassetpulse-demo-terraform-state-554422868760/itassetpulse/demo/
```

Expected result:

```text
terraform.tfstate
```

Verify bucket versioning:

```text
aws s3api get-bucket-versioning \
  --bucket itassetpulse-demo-terraform-state-554422868760
```

Verify public access block:

```bash
aws s3api get-public-access-block \
  --bucket itassetpulse-demo-terraform-state-554422868760
```

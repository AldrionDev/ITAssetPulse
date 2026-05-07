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
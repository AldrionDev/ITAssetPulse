# stack: data (remote state, ephemeral)

External database wiring. Spec: §4.4. State key: `itassetpulse/demo/data.tfstate`.

> Documentation-only until issue **#175** adds the Terraform configuration. No `.tf` here yet — do not run
> Terraform against this directory.

## Responsibility

MongoDB Atlas database user with a Terraform-generated password; AWS Secrets Manager secret holding the full
`MONGO_URI` (recovery window 0, `name_prefix`); **ARN-only output**. **No Terraform-managed Atlas IP
allow-list** — that is a manual runbook step (spec §11). Atlas API keys come from provider **environment
variables** (`MONGODB_ATLAS_PUBLIC_KEY` / `MONGODB_ATLAS_PRIVATE_KEY`), not tfvars.

## Planned inputs

`project_name`, `environment`, `atlas_project_id`, `mongodb_atlas_srv_host`, `mongodb_atlas_app_name`,
`atlas_database_username`, `mongodb_database_name`. Values from `../environments/demo/data.tfvars`.

## Planned outputs

`mongodb_secret_arn` (never the secret value).

Implemented in: **#175**.

locals {
  common_tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
    Purpose   = "account-guardrails"
  }

  budget_name = "${var.project_name}-monthly-budget"

  # Account-scoped wildcard budget ARN pattern, not a reference to the specific
  # budget resource: avoids a dependency cycle between the SNS topic policy and
  # the budget (see sns.tf / budget.tf).
  budgets_source_arn = join("", [
    "arn:",
    data.aws_partition.current.partition,
    ":budgets::",
    data.aws_caller_identity.current.account_id,
    ":budget/*",
  ])

  github_oidc_subject = join("", [
    "repo:",
    var.github_owner,
    "/",
    var.github_repo,
    ":ref:refs/heads/",
    var.github_branch,
  ])

  github_oidc_provider_arn = var.create_oidc_provider ? (
    aws_iam_openid_connect_provider.github_actions[0].arn
    ) : (
    data.aws_iam_openid_connect_provider.github_actions[0].arn
  )
}

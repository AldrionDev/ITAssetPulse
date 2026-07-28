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

  # One ArnLike pattern per #181 ECS observability alarm, not a single
  # project-wide wildcard: the wildcard replaces only the environment segment
  # of the ecs stack's name_prefix ("${project_name}-${environment}"), while
  # each alarm's functional suffix stays fixed. This stack stays
  # environment-agnostic (no var.environment, no ecs remote-state read - the
  # dependency direction remains account -> ecs, see sns.tf) yet still scopes
  # SNS:Publish tighter than a bare "${project_name}-*" would.
  cloudwatch_alarm_source_arns = [
    join("", [
      "arn:",
      data.aws_partition.current.partition,
      ":cloudwatch:",
      var.aws_region,
      ":",
      data.aws_caller_identity.current.account_id,
      ":alarm:",
      var.project_name,
      "-*-frontend-healthy-host",
    ]),
    join("", [
      "arn:",
      data.aws_partition.current.partition,
      ":cloudwatch:",
      var.aws_region,
      ":",
      data.aws_caller_identity.current.account_id,
      ":alarm:",
      var.project_name,
      "-*-backend-healthy-host",
    ]),
    join("", [
      "arn:",
      data.aws_partition.current.partition,
      ":cloudwatch:",
      var.aws_region,
      ":",
      data.aws_caller_identity.current.account_id,
      ":alarm:",
      var.project_name,
      "-*-alb-target-5xx",
    ]),
  ]

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

output "sns_topic_arn" {
  description = "ARN of the SNS topic used for budget alerts."
  value       = aws_sns_topic.budget_alerts.arn
}

output "budget_name" {
  description = "Name of the monthly cost budget."
  value       = aws_budgets_budget.monthly_cost.name
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub Actions OIDC provider (created by this stack or data-sourced from an existing one)."
  value       = local.github_oidc_provider_arn
}

output "image_publish_role_arn" {
  description = "ARN of the IAM role GitHub Actions assumes via OIDC to push images to ECR."
  value       = aws_iam_role.image_publish.arn
}

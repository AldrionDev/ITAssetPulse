resource "aws_sns_topic" "budget_alerts" {
  name = "${var.project_name}-budget-alerts"
}

data "aws_iam_policy_document" "budget_alerts_topic_policy" {
  statement {
    sid     = "AllowBudgetsPublish"
    effect  = "Allow"
    actions = ["SNS:Publish"]

    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com"]
    }

    resources = [aws_sns_topic.budget_alerts.arn]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = [local.budgets_source_arn]
    }
  }
}

resource "aws_sns_topic_policy" "budget_alerts" {
  arn    = aws_sns_topic.budget_alerts.arn
  policy = data.aws_iam_policy_document.budget_alerts_topic_policy.json
}

# email is a Terraform "partially supported" SNS subscription protocol: an
# unconfirmed subscription cannot be deleted/unsubscribed by Terraform. See
# README for the required one-time manual confirmation and its destroy-time
# implications.
resource "aws_sns_topic_subscription" "budget_alerts_email" {
  topic_arn = aws_sns_topic.budget_alerts.arn
  protocol  = "email"
  endpoint  = var.budget_notification_email
}

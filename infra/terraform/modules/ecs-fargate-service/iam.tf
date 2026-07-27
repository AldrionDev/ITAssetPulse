data "aws_iam_policy_document" "execution_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${local.name_prefix}-execution"
  assume_role_policy = data.aws_iam_policy_document.execution_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Scoped to exactly the ARNs in var.secrets. No policy is created for an empty
# map, and this policy never grants kms:Decrypt: the demo secrets (Mongo URI,
# JWT secret) use the AWS-managed (SSE) key, not a customer-managed KMS key.
# A future customer-managed key would need a separate, explicitly scoped
# kms:Decrypt grant on that key's ARN.
data "aws_iam_policy_document" "secrets_access" {
  count = length(var.secrets) > 0 ? 1 : 0

  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = values(var.secrets)
  }
}

resource "aws_iam_role_policy" "secrets_access" {
  count = length(var.secrets) > 0 ? 1 : 0

  name   = "${local.name_prefix}-secrets-access"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.secrets_access[0].json
}

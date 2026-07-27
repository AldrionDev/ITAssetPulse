data "aws_region" "current" {}

resource "aws_ecs_task_definition" "this" {
  family                   = local.name_prefix
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.cpu)
  memory                   = tostring(var.memory)
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = var.name
      image     = var.container_image
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = local.environment_variables_list
      secrets     = local.secrets_list

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.region
          "awslogs-stream-prefix" = var.name
        }
      }
    }
  ])

  tags = local.common_tags

  lifecycle {
    precondition {
      # Safe lookup with a [] default: an unrecognized cpu value falls through
      # to this module's own error message instead of an "Invalid index" crash.
      condition = contains(
        lookup(local.fargate_cpu_memory_options, tostring(var.cpu), []),
        var.memory
      )
      error_message = "cpu/memory (${var.cpu}/${var.memory}) is not a supported AWS Fargate CPU/memory pair. See local.fargate_cpu_memory_options for the supported combinations."
    }
  }
}

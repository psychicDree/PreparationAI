# Terraform outputs for AWS infrastructure

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer zone ID"
  value       = aws_lb.main.zone_id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.main.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.main.name
}

output "secrets_manager_secrets" {
  description = "Secrets Manager secret ARNs"
  value = {
    db_password = aws_secretsmanager_secret.db_password.arn
    jwt_secret  = aws_secretsmanager_secret.jwt_secret.arn
    openai_key  = aws_secretsmanager_secret.openai_key.arn
    stripe_key  = aws_secretsmanager_secret.stripe_key.arn
  }
}

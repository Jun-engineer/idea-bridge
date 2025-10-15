output "frontend_bucket_name" {
  description = "S3 bucket hosting the SPA assets."
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain serving the SPA."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidations."
  value       = aws_cloudfront_distribution.frontend.id
}

output "privacy_policy_bucket_name" {
  description = "S3 bucket hosting the privacy policy page."
  value       = aws_s3_bucket.privacy_policy.bucket
}

output "privacy_policy_cloudfront_domain_name" {
  description = "CloudFront domain serving the privacy policy page."
  value       = aws_cloudfront_distribution.privacy_policy.domain_name
}

output "privacy_policy_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for privacy policy cache invalidations."
  value       = aws_cloudfront_distribution.privacy_policy.id
}

output "api_gateway_endpoint" {
  description = "Invoke URL for the HTTP API Gateway."
  value       = aws_apigatewayv2_api.backend.api_endpoint
}

output "lambda_function_name" {
  description = "Deployed Lambda function name."
  value       = aws_lambda_function.backend.function_name
}

output "dynamodb_table_name" {
  description = "Provisioned DynamoDB table name (for future persistence)."
  value       = aws_dynamodb_table.app.name
}

output "github_actions_role_arn" {
  description = "IAM role ARN that GitHub Actions should assume for deployments."
  value       = aws_iam_role.github_actions.arn
}

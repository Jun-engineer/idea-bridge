# IdeaBridge Serverless Architecture

```mermaid
graph TD
    subgraph Client Devices
        Web[Browser]
        Mobile[Mobile App]
    end

    subgraph Frontend Edge
        CF[Amazon CloudFront]
        S3[Amazon S3 Static Website]
    end

    subgraph API Layer
        APIGW[Amazon API Gateway]
        Lambda[AWS Lambda (Express Handler)]
    end

    subgraph Data & Messaging
        DynamoDB[(Amazon DynamoDB)]
        SNS[(Amazon SNS)]
    end

    subgraph Delivery Pipelines
        CodeBuild[AWS CodeBuild]
        CodePipeline[AWS CodePipeline]
    end

    Web -->|HTTPS| CF
    CF -->|Origin| S3

    Mobile -->|HTTPS| APIGW
    CF -->|API calls| APIGW

    APIGW -->|Invoke| Lambda
    Lambda -->|Read/Write| DynamoDB
    Lambda -->|Publish SMS| SNS

    CodePipeline -->|Build & Deploy Frontend| S3
    CodePipeline -->|Deploy Lambda| Lambda
    CodeBuild -->|Build Artifacts| CodePipeline

    SNS -->|SMS| Users[End Users]
```

## Flow Summary
1. Browsers request the SPA through CloudFront; assets are stored in S3.
2. Mobile apps communicate directly with API Gateway over HTTPS.
3. API Gateway proxies requests to a Lambda function running the Express API via `@vendia/serverless-express`.
4. Lambda persists data in DynamoDB (future enhancement) and publishes verification SMS through Amazon SNS.
5. CodePipeline/CodeBuild orchestrate CI/CD for both frontend (S3 deployment) and backend (Lambda updates).

> **Note:** The current repository maintains in-memory stores. When you adopt DynamoDB, replace the mock store modules with real persistence to match this architecture.

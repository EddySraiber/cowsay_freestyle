#!/usr/bin/env groovy

// Jenkinsfile (Pipeline Script)
// This pipeline implements a CI/CD workflow with GitLab integration
// Includes Build, Test, Publish, and Deploy stages
// Assumes Jenkins container has access to Docker socket on host VM

pipeline {
    // Define the agent where this pipeline will execute
    agent any

    // Environment variables available for all stages
    environment {
        // GitLab connection details - these can also be configured in Jenkins UI
        // and referenced here
        GITLAB_API_TOKEN = credentials('gitlab-api-token')
        
        // Application details
        APP_NAME = "my-application"
        VERSION = "${BUILD_NUMBER}"
        
        // Docker registry details
        DOCKER_REGISTRY = "registry.example.com"
        DOCKER_IMAGE_NAME = "${DOCKER_REGISTRY}/${APP_NAME}"
        DOCKER_IMAGE_TAG = "${VERSION}"
        
        // Deployment details
        DEPLOY_ENV = "${params.ENVIRONMENT ?: 'staging'}"
    }
    
    // Define pipeline parameters that can be set at runtime
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['development', 'staging', 'production'], description: 'Deployment environment')
        booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run tests during build')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy after successful build')
    }

    // No tools section needed as we're using Docker for the build process
    
    // Define webhook trigger for GitLab
    triggers {
        gitlab(
            triggerOnPush: true,
            triggerOnMergeRequest: true,
            branchFilterType: 'All',
            secretToken: '${GITLAB_WEBHOOK_SECRET}'
        )
    }

    // Main pipeline stages
    stages {
        stage('Checkout') {
            steps {
                // Checkout from GitLab
                checkout([$class: 'GitSCM', 
                    branches: [[name: '*/main']], 
                    extensions: [], 
                    userRemoteConfigs: [[
                        credentialsId: 'gitlab-credentials', 
                        url: 'https://gitlab.example.com/mygroup/myproject.git'
                    ]]
                ])
                
                // Update GitLab commit status
                updateGitlabCommitStatus name: 'checkout', state: 'success'
            }
        }
        
        stage('Build') {
            steps {
                echo "Building ${APP_NAME} version ${VERSION}"
                
                // Notify GitLab that we're building
                updateGitlabCommitStatus name: 'build', state: 'running'
                
                // Build Docker image on the host VM using the Docker socket
                sh """
                # Build Docker image
                docker build -t ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} .
                docker tag ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} ${DOCKER_IMAGE_NAME}:latest
                """
                
                // Update GitLab with success
                updateGitlabCommitStatus name: 'build', state: 'success'
            }
            post {
                failure {
                    updateGitlabCommitStatus name: 'build', state: 'failed'
                }
            }
        }
        
        stage('Test') {
            when {
                expression { return params.RUN_TESTS }
            }
            steps {
                echo "Running tests for ${APP_NAME}"
                
                // Notify GitLab we're testing
                updateGitlabCommitStatus name: 'test', state: 'running'
                
                // Run tests using Docker
                sh """
                # Run tests in a container
                docker run --rm \
                    -v \$(pwd)/test-results:/app/test-results \
                    ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} \
                    /bin/sh -c "cd /app && ./run_tests.sh"
                """
                
                // Update GitLab with success
                updateGitlabCommitStatus name: 'test', state: 'success'
            }
            post {
                always {
                    // Publish test results if available
                    junit allowEmptyResults: true, testResults: 'test-results/**/*.xml'
                }
                failure {
                    updateGitlabCommitStatus name: 'test', state: 'failed'
                }
            }
        }
        
        stage('Publish') {
            steps {
                echo "Publishing ${APP_NAME} version ${VERSION}"
                
                // Notify GitLab we're publishing
                updateGitlabCommitStatus name: 'publish', state: 'running'
                
                // Push Docker image to registry
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-credentials', 
                    usernameVariable: 'DOCKER_USERNAME', 
                    passwordVariable: 'DOCKER_PASSWORD')]) {
                    
                    sh """
                    echo ${DOCKER_PASSWORD} | docker login ${DOCKER_REGISTRY} -u ${DOCKER_USERNAME} --password-stdin
                    docker push ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}
                    docker push ${DOCKER_IMAGE_NAME}:latest
                    """
                }
                
                // Archive any relevant artifacts
                archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true, fingerprint: true
                
                // Update GitLab with success
                updateGitlabCommitStatus name: 'publish', state: 'success'
            }
            post {
                failure {
                    updateGitlabCommitStatus name: 'publish', state: 'failed'
                }
            }
        }
        
        stage('Deploy') {
            when {
                expression { return params.DEPLOY }
            }
            steps {
                echo "Deploying ${APP_NAME} version ${VERSION} to ${DEPLOY_ENV}"
                
                // Notify GitLab we're deploying
                updateGitlabCommitStatus name: 'deploy', state: 'running'
                
                // Deployment scripts
                script {
                    switch(DEPLOY_ENV) {
                        case 'development':
                            // Deploy to dev environment
                            sh './deploy.sh development ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}'
                            break
                        case 'staging':
                            // Deploy to staging environment
                            sh './deploy.sh staging ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}'
                            break
                        case 'production':
                            // Manual approval before production deployment
                            timeout(time: 60, unit: 'MINUTES') {
                                input message: 'Approve deployment to production?'
                            }
                            // Deploy to production
                            sh './deploy.sh production ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}'
                            break
                    }
                }
                
                // Update GitLab with success
                updateGitlabCommitStatus name: 'deploy', state: 'success'
            }
            post {
                failure {
                    updateGitlabCommitStatus name: 'deploy', state: 'failed'
                }
            }
        }
    }
    
    // Post-build actions that run at the end of the pipeline
    post {
        success {
            echo "CI/CD pipeline completed successfully!"
            
            // Notify the team on success
            emailext (
                subject: "Pipeline Successful: ${currentBuild.fullDisplayName}",
                body: "Your pipeline completed successfully. Check out the results at ${BUILD_URL}",
                recipientProviders: [culprits(), developers(), requestor()]
            )
            
            // Update GitLab with overall success
            updateGitlabCommitStatus name: 'pipeline', state: 'success'
        }
        failure {
            echo "CI/CD pipeline failed!"
            
            // Notify the team on failure
            emailext (
                subject: "Pipeline Failed: ${currentBuild.fullDisplayName}",
                body: "Your pipeline failed. Check out the errors at ${BUILD_URL}",
                recipientProviders: [culprits(), developers(), requestor()]
            )
            
            // Update GitLab with overall failure
            updateGitlabCommitStatus name: 'pipeline', state: 'failed'
        }
        always {
            // Clean up workspace
            cleanWs()
        }
    }
}
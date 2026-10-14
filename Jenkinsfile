pipeline {
    agent any

    environment {
        IMAGE = 'anshu226/smart-backend'
        TAG   = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build and Test') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }

        stage('Docker Build') {
            steps {
                dir('backend') {
                    sh 'docker build -t $IMAGE:$TAG -t $IMAGE:latest .'
                }
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                 usernameVariable: 'DH_USER',
                                 passwordVariable: 'DH_TOKEN')]) {
                    sh 'echo $DH_TOKEN | docker login -u $DH_USER --password-stdin'
                    sh 'docker push $IMAGE:$TAG'
                    sh 'docker push $IMAGE:latest'
                }
            }
        }

        stage('Minikube Deployment') {
            steps {
                sh 'kubectl apply -f k8s/'
                sh 'kubectl set image deployment/smart-backend smart-backend=$IMAGE:$TAG'
                sh 'kubectl rollout status deployment/smart-backend --timeout=120s'
            }
        }

        stage('Verification') {
            steps {
                sh 'kubectl get pods'
                sh 'kubectl get deployment'
                sh 'kubectl get svc'
            }
        }
    }
}
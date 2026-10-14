pipeline {
  agent any
  environment {
    IMAGE = "tamannaroy/smart-placement"
    TAG   = "${BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build and Test') {
      steps {
        dir('frontend') {
          sh 'npm install'
          sh 'npm run build'
        }
      }
    }
    stage('Docker Build') {
      steps {
        sh 'docker build -t $IMAGE:$TAG -t $IMAGE:latest frontend'
      }
    }
    stage('Push Image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
            usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh 'echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin'
          sh 'docker push $IMAGE:$TAG'
          sh 'docker push $IMAGE:latest'
        }
      }
    }
    stage('Deploy to Minikube') {
      steps {
        sh "sed -i 's|IMAGE_TAG|${TAG}|' k8s/deployment.yaml"
        sh 'kubectl apply -f k8s/'
        sh 'kubectl rollout status deployment/smart-placement --timeout=180s'
      }
    }
    stage('Verify') {
      steps {
        sh 'kubectl get pods'
        sh 'kubectl get deployment'
        sh 'kubectl get svc'
        sh 'curl -s http://$(minikube ip):30080 | head -5'
      }
    }
  }
}

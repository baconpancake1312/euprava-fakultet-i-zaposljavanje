# Start from a Golang base image
FROM golang:latest as builder

# Set the working directory inside the container
WORKDIR /app

# Copy the necessary files into the container
COPY . .

# Build the binary
RUN go build -o main .

# Set the environment variable for the port the microservice listens on
ENV PORT=8080

# Expose the specified port
EXPOSE 8080

# Specify the command to run the binary when the container starts
CMD ["./main"]

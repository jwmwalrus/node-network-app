import { buildSchema } from 'graphql';

const gql = String.raw;

export default buildSchema(gql`
    type TestData {
        text: String!
        views: Int!
    }

    type AuthData {
        token: String!
        userId: String!
    }

    input UserInputData {
        email: String!
        name: String!
        password: String!
    }

    input PostInputData {
        title: String!
        content: String!
        imageUrl: String!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type PostData {
        posts: [Post!]!
        currentPage: Int!
        totalPages: Int!
        totalItems: Int!
    }

    type RootQuery {
        login(email: String!, password: String): AuthData!
        post(postId: ID!): Post!
        posts(page: Int): PostData!
        user: User!
    }

    type RootMutation {
        createUser(userInput: UserInputData!): User!
        createPost(postInput: PostInputData!): Post!
        updatePost(id: ID!, postInput: PostInputData): Post!
        deletePost(postId: ID!): Boolean!
        updateStatus(status: String!): User!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);

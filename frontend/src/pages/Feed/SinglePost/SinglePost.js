import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

let baseUrl = 'http://localhost:8080';
const gql = String.raw;

class SinglePost extends Component {
    state = {
        title: '',
        author: '',
        date: '',
        image: '',
        content: '',
    };

    componentDidMount() {
        const postId = this.props.match.params.postId;
        fetch(baseUrl + '/graphql', {
            headers: {
                Authorization: 'Bearer ' + this.props.token,
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                query: gql`
                    query FetchSinglePost($postId: ID!) {
                        post(postId: $postId) {
                            _id
                            title
                            content
                            imageUrl
                            creator {
                                name
                            }
                            createdAt
                        }
                    }
                `,
                variables: { postId },
            }),
        })
            .then((res) => res.json())
            .then((resData) => {
                if (resData.errors) {
                    if (resData.errors[0].status === 422) {
                        throw new Error('Validation failed.');
                    } else {
                        console.log('Error!');
                        throw new Error('Could not get post');
                    }
                }
                console.log({ resData });

                const { title, creator, createdAt, content, imageUrl } =
                    resData.data.post;
                this.setState({
                    title,
                    author: creator.name,
                    date: new Date(createdAt).toLocaleDateString('en-US'),
                    content,
                    image: baseUrl + imageUrl,
                });
            })
            .catch(console.error);
    }

    render() {
        return (
            <section className="single-post">
                <h1>{this.state.title}</h1>
                <h2>
                    Created by {this.state.author} on {this.state.date}
                </h2>
                <div className="single-post__image">
                    <Image contain imageUrl={this.state.image} />
                </div>
                <p>{this.state.content}</p>
            </section>
        );
    }
}

export default SinglePost;

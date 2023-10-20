import React, { Component, Fragment } from 'react';
import openSocket from 'socket.io-client';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

const baseUrl = 'http://localhost:8080';

class Feed extends Component {
    state = {
        isEditing: false,
        posts: [],
        totalPosts: 0,
        editPost: null,
        status: '',
        postPage: 1,
        postsLoading: true,
        editLoading: false,
    };

    componentDidMount() {
        fetch('URL')
            .then((res) => {
                if (res.status !== 200) {
                    throw new Error('Failed to fetch user status.');
                }
                return res.json();
            })
            .then((resData) => {
                this.setState({ status: resData.status });
            })
            .catch(this.catchError);

        this.loadPosts();

        const socket = openSocket(baseUrl);
        socket.on('posts', (data) => {
            switch (data.action) {
                case 'create':
                // fallthrough
                case 'update':
                    console.info('Adding/updating post');
                    this.updatePost(data.post);
                    break;

                case 'delete':
                    console.info('Removing post');
                    this.deletePost(data.post);
                    break;

                default:
                    break;
            }
        });
    }

    updatePost = (post) => {
        this.setState((prevState) => {
            const updatedPosts = [...prevState.posts];
            let totalPosts = prevState.totalPosts;
            const updatedPostIndex = updatedPosts.findIndex(
                (p) => p._id === post._id,
            );
            if (updatedPostIndex > -1) {
                updatedPosts[updatedPostIndex] = post;
            } else {
                totalPosts = updatedPosts.unshift(post);
            }
            return {
                posts: updatedPosts,
                totalPosts,
            };
        });
    };

    deletePost = (post) => {
        this.setState((prevState) => {
            const updatedPosts = prevState.posts.filter(
                (p) => p._id.toString() !== post._id.toString(),
            );
            return {
                posts: updatedPosts,
                totalPosts: updatedPosts.length,
            };
        });
    };

    loadPosts = (direction) => {
        if (direction) {
            this.setState({ postsLoading: true, posts: [] });
        }
        let page = this.state.postPage;
        if (direction === 'next') {
            page++;
            this.setState({ postPage: page });
        }
        if (direction === 'previous') {
            page--;
            this.setState({ postPage: page });
        }
        fetch(baseUrl + '/feed/posts/?page=' + page, {
            headers: { Authorization: 'Bearer ' + this.props.token },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch posts.');
                }
                return res.json();
            })
            .then((resData) => {
                this.setState({
                    posts: resData.posts.map((post) => ({
                        ...post,
                        imagePath: post.imageUrl,
                    })),
                    totalPosts: resData.totalItems,
                    postsLoading: false,
                });
            })
            .catch(this.catchError);
    };

    statusUpdateHandler = (event) => {
        event.preventDefault();
        fetch('URL')
            .then((res) => {
                if (res.status !== 200 && res.status !== 201) {
                    throw new Error("Can't update status!");
                }
                return res.json();
            })
            .then((resData) => {
                console.log({ resData });
            })
            .catch(this.catchError);
    };

    newPostHandler = () => {
        this.setState({ isEditing: true });
    };

    startEditPostHandler = (postId) => {
        this.setState((prevState) => {
            const loadedPost = {
                ...prevState.posts.find((p) => p._id === postId),
            };

            return {
                isEditing: true,
                editPost: loadedPost,
            };
        });
    };

    cancelEditHandler = () => {
        this.setState({ isEditing: false, editPost: null });
    };

    finishEditHandler = (postData) => {
        this.setState({
            editLoading: true,
        });

        let url = baseUrl + '/feed/posts';
        let method = 'POST';
        if (this.state.editPost) {
            url += '/' + this.state.editPost._id;
            method = 'PUT';
        }

        const { title, content, image } = postData;

        const fd = new FormData();
        fd.append('title', title);
        fd.append('content', content);
        fd.append('image', image);

        fetch(url, {
            headers: { Authorization: 'Bearer ' + this.props.token },
            method,
            body: fd,
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Creating/editing post failed');
                }
                return res.json();
            })
            .then((resData) => {
                console.log({ resData });
                const post = {
                    _id: resData.post._id,
                    title: resData.post.title,
                    content: resData.post.content,
                    creator: resData.post.creator,
                    createdAt: resData.post.createdAt,
                };
                this.setState((prevState) => {
                    let updatedPosts = [...prevState.posts];
                    if (prevState.editPost) {
                        const postIndex = prevState.posts.findIndex(
                            (p) => p._id === prevState.editPost._id,
                        );
                        updatedPosts[postIndex] = post;
                    } else if (prevState.posts.length < 2) {
                        updatedPosts = prevState.posts.concat(post);
                    }
                    return {
                        posts: updatedPosts,
                        isEditing: false,
                        editPost: null,
                        editLoading: false,
                    };
                });
            })
            .catch((err) => {
                console.error(err);
                this.setState({
                    isEditing: false,
                    editPost: null,
                    editLoading: false,
                    error: err,
                });
            });
    };

    statusInputChangeHandler = (input, value) => {
        this.setState({ status: value });
    };

    deletePostHandler = (postId) => {
        this.setState({ postsLoading: true });

        fetch(baseUrl + '/feed/posts/' + postId, {
            headers: { Authorization: 'Bearer ' + this.props.token },
            method: 'DELETE',
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Deleting a post failed!');
                }
                return Promise.resolve();
            })
            .then(() => {
                this.setState((prevState) => {
                    const updatedPosts = prevState.posts.filter(
                        (p) => p._id.toString() !== postId,
                    );
                    return { posts: updatedPosts, postsLoading: false };
                });
            })
            .catch((err) => {
                console.error(err);
                this.setState({ postsLoading: false });
            });
    };

    errorHandler = () => {
        this.setState({ error: null });
    };

    catchError = (error) => {
        this.setState({ error: error });
    };

    render() {
        return (
            <Fragment>
                <ErrorHandler
                    error={this.state.error}
                    onHandle={this.errorHandler}
                />
                <FeedEdit
                    editing={this.state.isEditing}
                    selectedPost={this.state.editPost}
                    loading={this.state.editLoading}
                    onCancelEdit={this.cancelEditHandler}
                    onFinishEdit={this.finishEditHandler}
                />
                <section className="feed__status">
                    <form onSubmit={this.statusUpdateHandler}>
                        <Input
                            type="text"
                            placeholder="Your status"
                            control="input"
                            onChange={this.statusInputChangeHandler}
                            value={this.state.status}
                        />
                        <Button mode="flat" type="submit">
                            Update
                        </Button>
                    </form>
                </section>
                <section className="feed__control">
                    <Button
                        mode="raised"
                        design="accent"
                        onClick={this.newPostHandler}
                    >
                        New Post
                    </Button>
                </section>
                <section className="feed">
                    {this.state.postsLoading && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <Loader />
                        </div>
                    )}
                    {this.state.posts.length <= 0 &&
                    !this.state.postsLoading ? (
                        <p style={{ textAlign: 'center' }}>No posts found.</p>
                    ) : null}
                    {!this.state.postsLoading && (
                        <Paginator
                            onPrevious={this.loadPosts.bind(this, 'previous')}
                            onNext={this.loadPosts.bind(this, 'next')}
                            lastPage={Math.ceil(this.state.totalPosts / 2)}
                            currentPage={this.state.postPage}
                        >
                            {this.state.posts.map((post) => (
                                <Post
                                    key={post._id}
                                    id={post._id}
                                    author={post.creator.name}
                                    date={new Date(
                                        post.createdAt,
                                    ).toLocaleDateString('en-US')}
                                    title={post.title}
                                    image={post.imageUrl}
                                    content={post.content}
                                    onStartEdit={this.startEditPostHandler.bind(
                                        this,
                                        post._id,
                                    )}
                                    onDelete={this.deletePostHandler.bind(
                                        this,
                                        post._id,
                                    )}
                                />
                            ))}
                        </Paginator>
                    )}
                </section>
            </Fragment>
        );
    }
}

export default Feed;

import { expect } from 'chai';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';

import isAuth from '../middleware/is-auth.js';

describe('isAuth middleware', () => {
    it('should throw an error if the authorization header is missing', () => {
        const req = {
            get: () => null,
        };
        expect(isAuth.bind(this, req, {}, () => {})).to.throw(
            'Not authenticated',
        );
    });

    it('should throw an error if the authorization header is only one string', () => {
        const req = {
            get: () => 'xxx',
        };
        expect(isAuth.bind(this, req, {}, () => {})).to.throw();
    });

    it('should throw an error if the token cannot be verified', () => {
        const req = {
            get: () => 'Bearer xxx',
        };
        expect(isAuth.bind(this, req, {}, () => {})).to.throw();
    });

    it('should yield a userId after decoding the token', () => {
        const req = {
            get: () => 'Bearer xxx',
        };

        sinon.stub(jwt, 'verify');
        jwt.verify.returns({ userId: 'abc' });

        isAuth(req, {}, () => {});
        expect(req).to.have.property('userId');

        jwt.verify.restore();
    });
});

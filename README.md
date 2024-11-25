# Storacha Referrals Service

Simple RESTful service for tracking Storacha referrals.

## Run

To get started, clone this repo and run:

```
pnpm install
pnpm dev
```

## Domain Model

A `refcode` is a 16 character string drawn from
the [`nolookalikesSafe` nanoid dictionary](https://github.com/CyberAP/nanoid-dictionary).
It is associated with an email address.

A `referral` is a record of a different email address using a refcode to sign up. It
records an email, a refcode and referral time.

## API 

The API does not use any sort of authorization at the moment as it needs to be usable by 
users who have not yet established an identity relationship with us. As a result it's important
that it not return sensitive information like email addresses in any responses.

### `POST /refcode/create'`

Create a refcode by posting form data with `email` set to the email the refcode will
be attached to.

### `GET /refcode/:email'`

Get the refcode associated with an email. Returns a JSON object like:

```
{
  refcode: 'abc123'
}
```

### `POST /referrals/create'`

Create a referral by posting form data with `email` set to the email of the referred
user and `refcode` set to the refcode they used to sign up.

### `GET /referredby/:email'`

Get the refcode used when an email address signed up. Returns a JSON object like:

```
{
  refcode: 'abc123'
}
```

### `GET /referrals/:refcode'`

Get the referrals associated with a refcode. Returns a list of JSON objects like:


```
[ 
  { referredAt: '2024-11-21 00:45:12', rewarded: false }
]
```




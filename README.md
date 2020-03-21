# Codesanook FB comments reader
Read all comments of given post's permalink.

## Requirements
- Node >= 7
- Facebook user credentials

## Authentication
You can either pass your facebook credentials as environment variable:
- `FB_USER` for storing email
- `FB_PASSWORD` for storing password
- `FB_2FA_KEY` for storing 2FA if you use it. (optional)

## CLI Arguments:
```
    --url (required) This takes precedence over the env variable URL, it is Facebook post's permalink.
    --fbuser         This takes precedence over the env variable FB_USER
    --fbpassword     This takes precedence over the env variable FB_PASSWORD
    --fb2fakey       This takes precedence over the env variable FB_2FA_KEY (optional)
```

## Examples
```
> yarn install

> $env:FB_USER = "space-ant@codesanook.com"
> $env:FB_PASSWORD = "1234567890"
> $env:URL = "https://www.facebook.com/groups/ThaiPGAssociateSociety/permalink/xxxxx/"
> $env:FB_2FA_KEY = "123456" # optional

> yarn start
```

## Result
All comment HTML are in comments.text that you can process latest, it will be remove if you run the command again.
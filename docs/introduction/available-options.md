# Available options

Most of Chromatic [CLI options](https://www.chromatic.com/docs/cli/#configuration-options) are accepted by Chromado. If an option is not accepted, Chromado will output an error message.

Here's how you can specify additional Chromatic CLI options:

```yaml !#4 chromatic.yml
- task: CmdLine@2
  displayName: Chromatic
  inputs:
    script: pnpm dlx @workleap/chromado --exit-zero-on-changes
  env:
    CHROMATIC_PROJECT_TOKEN: $(CHROMATIC_PROJECT_TOKEN)
    CHROMATIC_PULL_REQUEST_COMMENT_ACCESS_TOKEN: $(PULL_REQUEST_COMMENT_ACCESS_TOKEN)
```

In addition to Chromatic CLI options, a few environment variables are accepted 👇

## `CHROMATIC_DEBUG`

Add the `CHROMATIC_DEBUG` environment variable to your `chromatic.yml` pipeline to start a Chromatic build in "debug" mode and to benefit from additional logs from the Chromado:

```yaml !#8 chromatic.yml
- task: CmdLine@2
  displayName: Chromatic
  inputs:
    script: pnpm dlx @workleap/chromado
  env:
    CHROMATIC_PROJECT_TOKEN: $(CHROMATIC_PROJECT_TOKEN)
    CHROMATIC_PULL_REQUEST_COMMENT_ACCESS_TOKEN: $(PULL_REQUEST_COMMENT_ACCESS_TOKEN)
    CHROMATIC_DEBUG: true
```

## `CHROMATIC_DISABLE_TURBOSNAP`

Add the `CHROMATIC_DISABLE_TURBOSNAP` environment variable to your `chromatic.yml` pipeline to start a Chromatic build without [TurboSnap](https://www.chromatic.com/docs/turbosnap/):

```yaml !#8 chromatic.yml
- task: CmdLine@2
  displayName: Chromatic
  inputs:
    script: pnpm dlx @workleap/chromado
  env:
    CHROMATIC_PROJECT_TOKEN: $(CHROMATIC_PROJECT_TOKEN)
    CHROMATIC_PULL_REQUEST_COMMENT_ACCESS_TOKEN: $(PULL_REQUEST_COMMENT_ACCESS_TOKEN)
    CHROMATIC_DISABLE_TURBOSNAP: true
```

!!!info
We strongly encourage using TurboSnap as Chromatic snapshots are not cheap.
!!!

## `CHROMATIC_DEFAULT_BRANCH`

If your repository default branch is not `main`, using this option to provide the name of your repository default branch:

```yaml !#8 chromatic.yml
- task: CmdLine@2
  displayName: Chromatic
  inputs:
    script: pnpm dlx @workleap/chromado
  env:
    CHROMATIC_PROJECT_TOKEN: $(CHROMATIC_PROJECT_TOKEN)
    CHROMATIC_PULL_REQUEST_COMMENT_ACCESS_TOKEN: $(PULL_REQUEST_COMMENT_ACCESS_TOKEN)
    CHROMATIC_DEFAULT_BRANCH: master
```

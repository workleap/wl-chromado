#!/usr/bin/env node

/* eslint max-len: 0 */

/**
 * This script is heavily inspired by the official Chromatic Github Action.
 * @see https://github.com/chromaui/chromatic-cli/blob/main/action-src/main.ts
 */

import { getVariable, setResult, TaskResult } from "azure-pipelines-task-lib";
import { run as chromatic } from "chromatic/node";
import { postThread } from "./helpers.ts";

async function run() {
    try {
        const isDebug = getVariable("CHROMATIC_DEBUG");

        // This script accepts additional Chromatic CLI arguments.
        const argv: string[] = process.argv.slice(2);

        if (argv.includes("--only-changed")) {
            setResult(TaskResult.Failed, "--only-changed is added by default by @workleap/chromado.");

            return;
        }

        if (argv.includes("--auto-accept-changes")) {
            setResult(TaskResult.Failed, "--auto-accept-changes is already handled by @workleap/chromado.");

            return;
        }

        if (argv.includes("--debug")) {
            setResult(TaskResult.Failed, "--debug is bot supported by @workleap/chromado. Provide a \"CHROMATIC_DEBUG\" environment variable instead.");

            return;
        }

        // Enable Turbosnap by default. For additional information about TurboSnap see: https://www.chromatic.com/docs/turbosnap/.
        if (!getVariable("CHROMATIC_DISABLE_TURBOSNAP")) {
            argv.push("--only-changed");
        }

        // Defaults to "main" but is configurable becase we have a few repos still using "master" as de the default branch.
        const defaultBranch = getVariable("CHROMATIC_DEFAULT_BRANCH") ?? "main";

        // Accepting the baseline automatically when Chromatic is executed on the default branch.
        // Running Chromatic on the default branch allow us to use "squash" merge for PRs, see: https://www.chromatic.com/docs/custom-ci-provider/#squashrebase-merge-and-the-main-branch.
        // Furthermore, changes from PR doesn't seem to be updating the baseline at all but I don't know why, it seems like a bug with ADO (but according to Chromatic customers support it's normal).
        const isAutoAcceptingChangesOnMainBranch = getVariable("Build.Reason") !== "PullRequest" && getVariable("Build.SourceBranch") === `refs/heads/${defaultBranch}`;

        if (isAutoAcceptingChangesOnMainBranch) {
            // The second arg restrict the changes to be auto accepted only for the default branch.
            argv.push("--auto-accept-changes", defaultBranch);
        }

        // Add default branch paths to ignore.
        if (!argv.includes("--skip")) {
            argv.push("--skip", "renovate/**", "changeset-release/**");
        }

        if (isDebug) {
            argv.push("--debug");
        }

        if (isDebug) {
            console.log("[chromado] Running Chromatic with the following arguments: ", argv.join(", "));
        }

        const output = await chromatic({ argv });

        if (isDebug) {
            console.log(`[chromado] Chromatic exited with the following output: ${JSON.stringify(output, null, 2)}.`);
        }

        // 0 = OK
        // 1 = There are visual changes
        // 2 = There are components errors
        // For additional information about Chromatic exit codes, view: https://www.chromatic.com/docs/cli/#exit-codes.
        if (output.code !== 0 && output.code !== 1 && output.code !== 2) {
            setResult(TaskResult.Failed, `Chromatic exited with code "${output.code}". For additional information about Chromatic exit codes, view: https://www.chromatic.com/docs/cli/#exit-codes.`);

            return;
        }

        const success = output.code === 0;
        const changeCount = output.changeCount ?? 0;
        const errorCount = output.errorCount ?? 0;

        // Chromatic will returns changes even if they are automatically accepted.
        // We don't want to go though the whole process in this case as it's happening on the main branch.
        if (isAutoAcceptingChangesOnMainBranch) {
            if (isDebug) {
                const message = changeCount > 0
                    ? `${changeCount} visual ${changeCount === 1 ? "change" : "changes"} has been automatically accepted.`
                    : "";

                console.log(`[chromado] ${message}`);
            }

            return;
        }

        const comment = `
### ${success ? "✅" : "❌"} Chromatic

<div>
    <table>
    <tbody>
        <tr>
        <td>🔨 Latest commit:</td>
        <td>${getVariable("Build.SourceVersion")}</td>
        </tr>
        <tr>
        <td>💥 Component errors:</td>
        <td>
${errorCount === 0
        ? "✅&nbsp; None"
        : `❌&nbsp; ${errorCount} ${errorCount === 1 ? "error" : "errors"}`
}
        </td>
        </tr>
        <tr>
        <td>✨ Visual changes:</td>
        <td>
${changeCount === 0
        ? "✅&nbsp; None"
        : success
            ? `✅&nbsp; Accepted ${changeCount} visual ${changeCount === 1 ? "change" : "changes"}`
            : `❌&nbsp; Found ${changeCount} visual ${changeCount === 1 ? "change" : "changes"}`
}
        </tr>
        <tr>
        <td>🕵️‍♀️ Snapshots:</td>
        <td>
${output.inheritedCaptureCount !== 0
        ? `✅&nbsp; Captured ${output.actualCaptureCount} snapshots and inherited from ${output.inheritedCaptureCount} TurboSnaps`
        : "❌&nbsp; This build is not using <a href=\"https://www.chromatic.com/docs/turbosnap\" target=\"blank\" aria-label=\"https://www.chromatic.com/docs/turbosnap (Opens in a new window or tab)\">TurboSnap</a>. Be sure to read Workleap's <a href=\"https://workleap.github.io/wl-chromado/best-practices\" target=\"blank\" aria-label=\"https://workleap.github.io/wl-chromado/best-practices (Opens in a new window or tab)\">best practices<a/> for Chromatic."
}
        </td>
        </tr>
        <tr>
        <td>🔍 Build URL:</td>
        <td>
        <a href="${output.buildUrl}" target="_blank" aria-label="${output.buildUrl} (Opens in a new window or tab)">${output.buildUrl}</a>
        <span class="fabric-icon ms-Icon--NavigateExternalInline font-size" role="presentation" aria-hidden="true"></span>
        </td>
        </tr>
        <tr>
        <td>🎨 Storybook URL:</td>
        <td>
        <a href="${output.storybookUrl}" target="_blank" arial-label="${output.storybookUrl} (Opens in a new window or tab)">${output.storybookUrl}</a>
        <span class="fabric-icon ms-Icon--NavigateExternalInline font-size" role="presentation" aria-hidden="true"></span>
        </td>
        </tr>
    </tbody>
    </table>
</div>
`;

        await postThread(comment, {
            id: "CHROMATIC_THREAD_ID",
            accessToken: getVariable("CHROMATIC_PULL_REQUEST_COMMENT_ACCESS_TOKEN")
        });

        if (success) {
            setResult(TaskResult.Succeeded, "Chromatic succeeded.");
        } else {
            if (errorCount > 0) {
                setResult(TaskResult.Failed, `${errorCount} ${errorCount === 1 ? "test" : "tests"} failed.`);
            } else if (changeCount > 0) {
                const message = `Found ${changeCount} visual ${changeCount === 1 ? "change" : "changes"}. Review the ${changeCount === 1 ? "change" : "changes"} and re-queue the build to proceed.`;

                setResult(TaskResult.Failed, message);
            } else {
                setResult(TaskResult.Failed, "Chromatic failed.");
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            setResult(TaskResult.Failed, error.message);
        } else {
            setResult(TaskResult.Failed, `An unknown error occured: ${error}`);
        }
    }
}

run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));

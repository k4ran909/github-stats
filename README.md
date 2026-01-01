# [GitHub Stats Visualization](https://github.com/jstrieb/github-stats)

<!--
https://github.community/t/support-theme-context-for-images-in-light-vs-dark-mode/147981/84
-->
<a href="https://github.com/jstrieb/github-stats">
<img src="https://github.com/jstrieb/github-stats/blob/master/generated/overview.svg#gh-dark-mode-only" />
<img src="https://github.com/jstrieb/github-stats/blob/master/generated/languages.svg#gh-dark-mode-only" />
<img src="https://github.com/jstrieb/github-stats/blob/master/generated/overview.svg#gh-light-mode-only" />
<img src="https://github.com/jstrieb/github-stats/blob/master/generated/languages.svg#gh-light-mode-only" />
</a>

Generate visualizations of GitHub user and repository statistics with GitHub
Actions. Visualizations can include data for both private repositories, and for
repositories you have contributed to, but do not own.

Generated images automatically switch between GitHub light theme and GitHub
dark theme.

## Background

When someone views a profile on GitHub, it is often because they are curious
about a user's open source projects and contributions. Unfortunately, that
user's stars, forks, and pinned repositories do not necessarily reflect the
contributions they make to private repositories. The data likewise does not
present a complete picture of the user's total contributions beyond the current
year.

This project aims to collect a variety of profile and repository statistics
using the GitHub API. It then generates images that can be displayed in
repository READMEs, or in a user's [Profile
README](https://docs.github.com/en/github/setting-up-and-managing-your-github-profile/managing-your-profile-readme).

Since the project runs on GitHub Actions, no server is required to regularly
regenerate the images with updated statistics. Likewise, since the user runs
the analysis code themselves via GitHub Actions, they can use their GitHub
access token to collect statistics on private repositories that an external
service would be unable to access.

## Disclaimer

If the project is used with an access token that has sufficient permissions to
read private repositories, it may leak details about those repositories in
error messages. For example, the `aiohttp` library—used for asynchronous API
requests—may include the requested URL in exceptions, which can leak the name
of private repositories. If there is an exception caused by `aiohttp`, this
exception will be viewable in the Actions tab of the repository fork, and
anyone may be able to see the name of one or more private repositories.

Due to some issues with the GitHub statistics API, there are some situations
where it returns inaccurate results. Specifically, the repository view count
statistics and total lines of code modified are probably somewhat inaccurate.
Unexpectedly, these values will become more accurate over time as GitHub
caches statistics for your repositories. Additionally, repositories that were
last contributed to more than a year ago may not be included in the statistics
due to limitations in the results returned by the API.

For more information on inaccuracies, see issue
[#2](https://github.com/jstrieb/github-stats/issues/2),
[#3](https://github.com/jstrieb/github-stats/issues/3), and
[#13](https://github.com/jstrieb/github-stats/issues/13).

# Installation

<!-- TODO: Add details and screenshots -->

1. Create a personal access token (not the default GitHub Actions token) using
   the instructions
   [here](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token).
   Personal access token must have permissions: `read:user` and `repo`. Copy
   the access token when it is generated – if you lose it, you will have to
   regenerate the token.
   - Some users are reporting that it can take a few minutes for the personal
     access token to work. For more, see 
     [#30](https://github.com/jstrieb/github-stats/issues/30).
2. Create a copy of this repository by clicking
   [here](https://github.com/jstrieb/github-stats/generate). Note: this is
   **not** the same as forking a copy because it copies everything fresh,
   without the huge commit history. 
3. Go to the "Secrets" page of your copy of the repository. If this is the
   README of your copy, click [this link](../../settings/secrets/actions) to go
   to the "Secrets" page. Otherwise, go to the "Settings" tab of the
   newly-created repository and go to the "Secrets" page (bottom left).
4. Create a new secret with the name `ACCESS_TOKEN` and paste the copied
   personal access token as the value.
5. It is possible to change the type of statistics reported by adding other
   repository secrets. 
   - To ignore certain repos, add them (in owner/name format e.g.,
     `jstrieb/github-stats`) separated by commas to a new secret—created as
     before—called `EXCLUDED`.
   - To ignore certain languages, add them (separated by commas) to a new
     secret called `EXCLUDED_LANGS`. For example, to exclude HTML and TeX you
     could set the value to `html,tex`.
   - To show statistics only for "owned" repositories and not forks with
     contributions, add an environment variable (under the `env` header in the
     [main
     workflow](https://github.com/jstrieb/github-stats/blob/master/.github/workflows/main.yml))
     called `EXCLUDE_FORKED_REPOS` with a value of `true`.
   - These other values are added as secrets by default to prevent leaking
     information about private repositories. If you're not worried about that,
     you can change the values directly [in the Actions workflow
     itself](https://github.com/jstrieb/github-stats/blob/05de1314b870febd44d19ad2f55d5e59d83f5857/.github/workflows/main.yml#L48-L53).
6. Go to the [Actions
   Page](../../actions?query=workflow%3A"Generate+Stats+Images") and press "Run
   Workflow" on the right side of the screen to generate images for the first
   time. 
   - The images will be automatically regenerated every 24 hours, but they can
     be regenerated manually by running the workflow this way.
7. Take a look at the images that have been created in the
   [`generated`](generated) folder.
8. To add your statistics to your GitHub Profile README, copy and paste the
   following lines of code into your markdown content. Change the `username`
   value to your GitHub username.
   ```md
   ![](https://raw.githubusercontent.com/username/github-stats/master/generated/overview.svg#gh-dark-mode-only)
   ![](https://raw.githubusercontent.com/username/github-stats/master/generated/overview.svg#gh-light-mode-only)
   ```
   ```md
   ![](https://raw.githubusercontent.com/username/github-stats/master/generated/languages.svg#gh-dark-mode-only)
   ![](https://raw.githubusercontent.com/username/github-stats/master/generated/languages.svg#gh-light-mode-only)
   ```
9. Link back to this repository so that others can generate their own
   statistics images.
10. Star this repo if you like it!


# Support the Project

There are a few things you can do to support the project:

- Star the repository (and follow me on GitHub for more)
- Share and upvote on sites like Twitter, Reddit, and Hacker News
- Report any bugs, glitches, or errors that you find

These things motivate me to keep sharing what I build, and they provide
validation that my work is appreciated! They also help me improve the
project. Thanks in advance!

If you are insistent on spending money to show your support, I encourage you to
instead make a generous donation to one of the following organizations. By advocating
for Internet freedoms, organizations like these help me to feel comfortable
releasing work publicly on the Web.

- [Electronic Frontier Foundation](https://supporters.eff.org/donate/)
- [Signal Foundation](https://signal.org/donate/)
- [Mozilla](https://donate.mozilla.org/en-US/)
- [The Internet Archive](https://archive.org/donate/index.php)


# Related Projects

- Inspired by a desire to improve upon
  [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats)
- Makes use of [GitHub Octicons](https://primer.style/octicons/) to precisely
  match the GitHub UI
 
 #   V e r c e l   D e p l o y m e n t  
  
 Y o u   c a n   h o s t   t h i s   p r o j e c t   o n   V e r c e l   t o   g e n e r a t e   s t a t i s t i c s   d y n a m i c a l l y   v i a   a n   A P I .  
  
 1 .     F o r k   t h i s   r e p o s i t o r y   o r   p u s h   y o u r   c o p y   t o   G i t H u b .  
 2 .     I m p o r t   t h e   p r o j e c t   i n t o   [ V e r c e l ] ( h t t p s : / / v e r c e l . c o m ) .  
 3 .     I n   V e r c e l   P r o j e c t   S e t t i n g s   >   E n v i r o n m e n t   V a r i a b l e s ,   a d d   t h e   f o l l o w i n g   v a r i a b l e s :  
         *       ` A C C E S S _ T O K E N ` :   Y o u r   G i t H u b   P e r s o n a l   A c c e s s   T o k e n .  
         *       ` G I T H U B _ A C T O R ` :   Y o u r   G i t H u b   U s e r n a m e .  
         *       ( O p t i o n a l )   ` E X C L U D E D ` :   R e p o s i t o r i e s   t o   e x c l u d e   ( c o m m a   s e p a r a t e d ) .  
         *       ( O p t i o n a l )   ` E X C L U D E D _ L A N G S ` :   L a n g u a g e s   t o   e x c l u d e   ( c o m m a   s e p a r a t e d ) .  
         *       ( O p t i o n a l )   ` E X C L U D E _ F O R K E D _ R E P O S ` :   S e t   t o   ` t r u e `   t o   e x c l u d e   f o r k e d   r e p o s i t o r i e s .  
 4 .     O n c e   d e p l o y e d ,   y o u r   s t a t s   w i l l   b e   a v a i l a b l e   d y n a m i c a l l y   a t :  
         *       ` h t t p s : / / < y o u r - p r o j e c t > . v e r c e l . a p p / a p i / o v e r v i e w `  
         *       ` h t t p s : / / < y o u r - p r o j e c t > . v e r c e l . a p p / a p i / l a n g u a g e s `  
  
 Y o u   c a n   u s e   t h e s e   U R L s   d i r e c t l y   i n   y o u r   G i t H u b   R E A D M E :  
 ` ` ` m d  
 ! [ O v e r v i e w ] ( h t t p s : / / < y o u r - p r o j e c t > . v e r c e l . a p p / a p i / o v e r v i e w )  
 ! [ L a n g u a g e s ] ( h t t p s : / / < y o u r - p r o j e c t > . v e r c e l . a p p / a p i / l a n g u a g e s )  
 ` ` `  
 
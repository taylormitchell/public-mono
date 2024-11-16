# Home

A home for my personal digital life. 

This is a fairly new set up, and I'm still figuring out what works and doesn't. But so far I'm thinking of it as an experiment across a few overlapping fronts: 

- Mono-repo maximalism: Put as much of my personal files in a single repo as possible.
- Workspace maximalism: Keep a single cursor workspace open all the time which includes *all* my projects and notes.
- Code/data mixing: Keep related code and data together in the same repo. Apps use files within the repo as a backend whenever possible.

## How I'm using it

So far I've been using it for my notes and side projects. I keep a single cursor workspace open all day with the repo open. In [.cursorrules](.cursorrules) I've added some
instructions to tell cursor it's meant to help me with my notes.

On mobile, I use [Working Copy](https://workingcopy.app/) to access my notes and projects. I've got a few iOS shortcuts set up to quickly create a note or open notes I commonly use.

I'm also using it for my todos. I have them interspersed throughout the repo, and use [todo cli](/packages/todo-cli/README.md) to list and filter them.

I've got a few side-project apps in here. All of them so far are for personal use only. For example I've got a [rest api](/packages/api/README.md) to read and write from this repo, and a few web apps which use it (e.g. [logging app](/packages/log-web/README.md)). A fair number of the projects I started on one day and haven't touched since. I'm not intending this to be a curated list of my best work, but more just a place I can throw anything.

## How it's going

Pros:
- I have quick access to all my projects and notes.
- It's easy to provide cursor with the context it needs, which is especially helpful for inter-related projects.
- It's much easier to add custom commands and workflows compared to web-based note-taking apps.

Cons:
- There are a lot more duplicate names in the workspace than would usually be the case, so jumping to files with cmd+p requires more specificity.
- Developing the rest api which reads, writes, and commits to the same repo the code lives was a pain. Easy to shoot myself in the foot.
- As a note-taking app, it's user interface isn't nearly as nice as apps like Notion or Obsidian. I'm also used to having a separation between my code and notes and tabbing between them, so it takes a bit of getting used to to have them mixed together.

## Dev ops

The [infra](/packages/infra) folder contains some scripts to deploy to my various machines. All web apps are deployed to a single ec2 instance. The cli apps and cron jobs are deployed to my mac. I've got a couple configs for my pc too.

I have a [sync script](/packages/infra/mac/sync.sh) which automatically commits, pulls, and pushes to github. It runs every minute via a cron job. This would be a crazy set up if working with a team, but for personal stuff I find I'm hardly ever using commits or branches. I just want a history of changes and a remote I can access from anywhere which stays in sync. It'll only sync the main branch, so if I do want to work on something without syncing, I just create a new branch.

The main repo is private, but I publish a public version with private data excluded to [public-home](https://github.com/taylormitchell/public-home) daily using a [github action](.github/workflows/publish-repo.yaml). 

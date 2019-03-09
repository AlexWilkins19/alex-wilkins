---
title: "Tips for later"
date: 2019-02-10T21:47:24Z
draft: true
---

##Headline

A little memorandum for how to put new content online. When playing around in Atom, and saving, the local Hugo server will automatically refresh. But when you want to push it to the git repo,
you need to do a couple of things. First, you write git status, to see what's changed. Then you write git add ., to add the new changes, then you write git commit -m "commit name", then you write git push origin master, assuming you've connected your git remote add origin "git url."

Once you've pushed it to the repo, then your site will automatically be updated through netlify.

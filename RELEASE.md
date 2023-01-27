# Using CI

 * Update ipyvolume/_version.py
 * Update js/package.json
 * Add and commit, e.g. `git add -u; git commit -m 'Update to version 0.6.0'`
 * Tag: `git tag v0.6.0`
 * Release using push: `git push upstream master v0.6.0`

# Manual

## To release a new version of ipyvolume on PyPI:

Update _version.py (set release version, remove 'dev')
git add and git commit
 * `python setup.py sdist upload`
* `python setup.py bdist_wheel upload`
* `git tag -a X.X.X -m 'comment'`
Update _version.py (add 'dev' and increment minor)
 * git add and git commit
 * `git push`
 * `git push --tags`

## To release a new version of ipyvolume on NPM:

# nuke the  `dist` and `node_modules`
 * git clean -fdx
 * `npm install`
 * `npm publish`

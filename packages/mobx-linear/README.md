# MobX Linear

- serialized types
- undo stack
- apply changes
- create placeholder


TODO see /Code/temp

TODO play around with decorators again
TODO ankify accessors, using tsx, ??

TODO I was imagining have a proxy around the objects. but then there are two proxies, right? the mobx one and mine (is that right?). if that's the case, that feels weird. Is there a way to hook into the mobx proxy?
- How are proxies with proxies handled?
- Can decorators on properties really not be used to add additional functionality on get/set?
- Is there a way to hook into the mobx proxy?

TODO An alternative model:

- Classes are dumber. They hold state, are reactive, and emit events.
- Maintaining the one-to-many collections is done through the store. The store watches
for relevant events and updates the collections accordingly.
- ^ We do this instead of reactions because we don't want reactions to update observables,
which causes 2 renders.
- Maybe specify the properties and one-to-many relationship with decorators? They just need
to register which properties on which models are related to which others. I think I had it
working well enough to do that. The debugging problem was separate.
- Maybe remove the deleted flag. When an object is added/created through the store, the store
can set up a proxy around it that throws an error when any of the deleted object's properties
are accessed. It's "deleted" which it's not in the respective map.

TODO play with https://trpc.io/ or alternative for the api and client


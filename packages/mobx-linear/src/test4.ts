import { autorun, observable, reaction, runInAction, toJS } from "mobx";

const set = observable.set();
const count = observable.object({
  value: 0,
});

autorun(() => {
  console.log(toJS(Array.from(set.values())));
});

reaction(
  () => count.value,
  (v) => {
    console.log("reaction", v);
    set.add(v);
  }
);

runInAction(() => {
  count.value = 1;
});

runInAction(() => {
  count.value = 2;
});

runInAction(() => {
  count.value = 3;
});

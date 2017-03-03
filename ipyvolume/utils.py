import collections

# original from http://stackoverflow.com/questions/3232943/update-value-of-a-nested-dictionary-of-varying-depth
def dict_deep_update(d, u):
    for k, v in u.items():
        if isinstance(v, collections.Mapping):
            r = dict_deep_update(d.get(k, {}), v)
            d[k] = r
        else:
            d[k] = u[k]
    return d

def nested_setitem(obj, dotted_name, value):
    items = dotted_name.split(".")
    for item in items[:-1]:
        if item not in obj:
            obj[item] = {}
        obj = obj[item]
    obj[items[-1]] = value
### ngFormTools ###
------------

A directive and some dom manipulation functions. Currently I'm undecided if the
dom manipulation functions should be publicly exposed via angular.element or kept private.

Note: This library requires the ngExtender module to also be loaded.

Example Usage

View:
```
<ui-form form-info='formSpecifications'> </ui-form>

```

Controller:
```
$scope.formSpecifications = {
        name: {
            type: "text",
            required: true,
            placeholder: 'Please enter a unique username',
            label: "Username"
        },
        email: {
            type: "email",
            required: true,
            placeholder: 'Please enter your email address',
            label: "E-mail"
				}
    };
```
# Dependencies

The STH component is a **Node.js application** which depends on certain Node.js modules as stated in the
[`project.json`](https://github.com/telefonicaid/fiware-sth-comet/blob/master/package.json) file. Currently, the STH
component currently supports **Node 0.10** and **Node 4.0**.

Apart from these Node.js modules, the STH component also needs a running MongoDB instance where the raw and aggregated
time series context information is stored for its proper functioning. Since the STH component uses
[MongoDB update operators](http://docs.mongodb.org/v2.6/reference/operator/update/) such as the `$max` and the `$min`
update operators which were introduced in version 2.6, there is a dependency of the STH component with this concrete
version of the MongoDB database. Consequently, a **MongoDB version >= 2.6** is needed to store the raw and aggregated
time series context information managed by the STH component.

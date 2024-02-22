## About

Heredicey is based on [Dicey](https://dicey.js.org) which is based on the wonderful [AnyDice](https://anydice.com/) made by [Jasper Flick](https://catlikecoding.com/jasper-flick/).

It's UI is completely different from dicey as it is designed to take Warhammer weapon profiles, but it uses dicey's math package.

Dicey is open-source under the MIT license.  Its source be found on [github](https://github.com/basicer/dicey).

### I think I found a problem with your math.

Please file a bug report on the [Issue Tracker](https://github.com/nstephenh/dicey/issues/new).


### Are there any changes to the math package from dicey?
I've added the "++" operator, which adds the probability of non-zero results from two given clouds.
I also think I've got re-rolls for non-dice working.

I don't currently have the calculator working as I haven't messed with the parser at all,
but I will look into it in the future or submit a pr upstream.

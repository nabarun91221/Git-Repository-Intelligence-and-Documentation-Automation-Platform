const validateDto = (dto) =>
{
    return async (req, res, next) =>
    {
        const { error, value } = dto.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            return res.status(422).send({
                success: false,
                type: "DTO Validation Error",
                message: error.details.map(d => d.message)
            })
        }
        console.log("req.body: ", req.body);
        console.log("response:", value)
        req.body = value
        next()
    }
}
export default validateDto
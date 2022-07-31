import { useState } from 'react'
import './Button.css'

export default ({ children, ...props }: any) => (
    <div className="generic-button" {...props}>
        {children}
    </div>
)

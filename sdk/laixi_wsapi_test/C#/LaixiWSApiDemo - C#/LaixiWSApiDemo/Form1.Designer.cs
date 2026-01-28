namespace LaixiWSApiDemo
{
    partial class Form1
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            label1 = new Label();
            button1 = new Button();
            button2 = new Button();
            button3 = new Button();
            buttoncon = new Button();
            label2 = new Label();
            SuspendLayout();
            // 
            // label1
            // 
            label1.AutoSize = true;
            label1.Location = new Point(63, 54);
            label1.Name = "label1";
            label1.Size = new Size(0, 17);
            label1.TabIndex = 0;
            // 
            // button1
            // 
            button1.Location = new Point(42, 214);
            button1.Name = "button1";
            button1.Size = new Size(152, 85);
            button1.TabIndex = 1;
            button1.Text = "发送Laixi Toast";
            button1.UseVisualStyleBackColor = true;
            button1.Click += button1_Click;
            // 
            // button2
            // 
            button2.Location = new Point(261, 214);
            button2.Name = "button2";
            button2.Size = new Size(175, 85);
            button2.TabIndex = 2;
            button2.Text = "启动来喜APP";
            button2.UseVisualStyleBackColor = true;
            button2.Click += button2_Click;
            // 
            // button3
            // 
            button3.Location = new Point(483, 214);
            button3.Name = "button3";
            button3.Size = new Size(179, 91);
            button3.TabIndex = 3;
            button3.Text = "屏幕上滑";
            button3.UseVisualStyleBackColor = true;
            button3.Click += button3_Click;
            // 
            // buttoncon
            // 
            buttoncon.Location = new Point(554, 41);
            buttoncon.Name = "buttoncon";
            buttoncon.Size = new Size(99, 42);
            buttoncon.TabIndex = 4;
            buttoncon.Text = "连接来喜";
            buttoncon.UseVisualStyleBackColor = true;
            buttoncon.Click += buttoncon_Click;
            // 
            // label2
            // 
            label2.AutoSize = true;
            label2.Location = new Point(63, 138);
            label2.Name = "label2";
            label2.Size = new Size(0, 17);
            label2.TabIndex = 5;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 17F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 450);
            Controls.Add(label2);
            Controls.Add(buttoncon);
            Controls.Add(button3);
            Controls.Add(button2);
            Controls.Add(button1);
            Controls.Add(label1);
            Name = "Form1";
            Text = "Laixi WSAPI Demo";
            Load += Form1_Load;
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private Label label1;
        private Button button1;
        private Button button2;
        private Button button3;
        private Button buttoncon;
        private Label label2;
    }
}